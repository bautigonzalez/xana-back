import { pool } from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { sendEmail } from '../services/emailService.js';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Helper para generar JWT
function generateToken(user) {
  return jwt.sign({
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider
  }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Registro tradicional
export async function register(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, provider) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, hashed, 'email']
    );
    const user = result.rows[0];
    const token = generateToken(user);
    res.status(201).json({ user: { ...user, password: undefined }, token });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    res.status(500).json({ error: 'Error en el registro' });
  }
}

// Login tradicional
export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const token = generateToken(user);
    res.json({ user: { ...user, password: undefined }, token });
  } catch (err) {
    res.status(500).json({ error: 'Error en el login' });
  }
}

// Obtener usuario autenticado
export async function me(req, res) {
  res.json({ user: req.user });
}

// Solicitar recuperación de contraseña (olvidó contraseña)
export async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'El email es requerido' });
  }

  try {
    // 1. Buscar usuario
    const userResult = await pool.query('SELECT id, name FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      // Por seguridad, respondemos éxito igual para no revelar qué emails están registrados
      return res.json({ success: true, message: 'Si el correo existe, se enviará un código de verificación' });
    }

    // 2. Generar PIN de 6 dígitos
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos de validez

    // 3. Guardar en DB
    await pool.query(
      'UPDATE users SET reset_code = $1, reset_code_expires_at = $2 WHERE id = $3',
      [pin, expiresAt, user.id]
    );

    // 4. Enviar email
    const mailContent = {
      to: email,
      subject: 'Recuperar tu contraseña - Xana',
      text: `Hola ${user.name},\n\nHaz solicitado restablecer tu contraseña. Tu código de verificación de 6 dígitos es: ${pin}\n\nEste código expira en 15 minutos.\n\nSi no solicitaste esto, puedes ignorar este correo.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 12px;">
          <h2 style="color: #1CC7B6; text-align: center;">Recuperación de Contraseña</h2>
          <p>Hola <strong>${user.name}</strong>,</p>
          <p>Has solicitado restablecer tu contraseña en Xana. Utiliza el siguiente código de verificación de 6 dígitos para continuar:</p>
          <div style="background-color: #F8FAFC; border: 1px dashed #1CC7B6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1CC7B6; border-radius: 8px; margin: 20px 0;">
            ${pin}
          </div>
          <p style="font-size: 12px; color: #64748B;">Este código expira en 15 minutos por razones de seguridad.</p>
          <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94A3B8; text-align: center;">Si no realizaste esta solicitud, puedes ignorar este correo con seguridad.</p>
        </div>
      `
    };

    await sendEmail(mailContent);

    res.json({ success: true, message: 'Si el correo existe, se enviará un código de verificación' });
  } catch (err) {
    console.error('❌ Error en forgotPassword:', err);
    res.status(500).json({ error: 'Error procesando la solicitud de contraseña' });
  }
}

// Restablecer contraseña con código PIN
export async function resetPassword(req, res) {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    // 1. Buscar usuario
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user || !user.reset_code) {
      return res.status(400).json({ error: 'Código de verificación inválido o vencido' });
    }

    // 2. Validar expiración y código
    const codeExpired = new Date() > new Date(user.reset_code_expires_at);
    if (codeExpired) {
      return res.status(400).json({ error: 'El código de verificación ha expirado' });
    }

    if (user.reset_code !== code) {
      return res.status(400).json({ error: 'Código de verificación incorrecto' });
    }

    // 3. Hashear nueva contraseña
    const hashed = await bcrypt.hash(newPassword, 10);

    // 4. Actualizar contraseña y limpiar código
    await pool.query(
      'UPDATE users SET password = $1, reset_code = NULL, reset_code_expires_at = NULL WHERE id = $2',
      [hashed, user.id]
    );

    res.json({ success: true, message: 'Contraseña restablecida con éxito' });
  } catch (err) {
    console.error('❌ Error en resetPassword:', err);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
}

// Eliminar todos los datos del usuario (chats, mensajes y favoritos)
export async function deleteUserData(req, res) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    // 1. Eliminar de user_favorites
    await pool.query('DELETE FROM user_favorites WHERE user_id = $1', [user.id]);

    // 2. Eliminar chats (los mensajes asociados se borran por CASCADE)
    await pool.query('DELETE FROM chats WHERE user_id = $1', [user.id]);

    res.json({ success: true, message: 'Todos tus datos de chats y favoritos fueron eliminados con éxito' });
  } catch (err) {
    console.error('❌ Error en deleteUserData:', err);
    res.status(500).json({ error: 'Error al eliminar tus datos de la cuenta' });
  }
} 