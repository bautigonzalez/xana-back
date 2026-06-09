import express from 'express';
import { register, login, me, forgotPassword, resetPassword, deleteUserData } from '../controllers/authController.js';
import { passport, generateToken } from '../config/passport.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Registro tradicional
router.post('/register', register);

// Login tradicional
router.post('/login', login);

// Google OAuth2
router.get('/google', (req, res, next) => {
  const { state } = req.query;
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state: state // Pass the state (which contains redirect_uri)
  })(req, res, next);
});

// Google OAuth2 callback
router.get('/google/callback', (req, res, next) => {
  const state = req.query.state ? JSON.parse(Buffer.from(req.query.state, 'base64').toString()) : {};
  passport.authenticate('google', { session: false, failureRedirect: '/' })(req, res, () => {
    // Generar JWT y redirigir
    const token = generateToken(req.user);

    // Si viene un redirect_uri en el state, usarlo (para mobile)
    if (state.redirect_uri) {
      const separator = state.redirect_uri.includes('?') ? '&' : '?';
      const targetUrl = `${state.redirect_uri}${separator}token=${token}`;

      if (!state.redirect_uri.startsWith('http')) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Redirigiendo a Xana...</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 50px 20px; background-color: #F8FAFC; color: #334155; }
              .card { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
              .btn { display: inline-block; padding: 14px 28px; background-color: #1CC7B6; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; margin-top: 20px; font-size: 16px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>¡Inicio de sesión exitoso!</h2>
              <p>Presiona el botón de abajo para volver a la aplicación Xana si no eres redirigido automáticamente:</p>
              <a class="btn" href="${targetUrl}">Volver a Xana</a>
            </div>
            <script>
              window.location.href = "${targetUrl}";
              setTimeout(function() {
                window.location.href = "${targetUrl}";
              }, 500);
            </script>
          </body>
          </html>
        `);
      }
      return res.redirect(targetUrl);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  });
});

// Middleware para verificar JWT
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Obtener usuario autenticado
router.get('/me', requireAuth, me);

// Verificar JWT y devolver usuario (para persistencia de sesión)
router.get('/verify', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Logout (dummy, solo responde OK)
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Sesión cerrada' });
});

// Recuperar contraseña
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Eliminar datos personales (chats y favoritos)
router.delete('/delete-data', requireAuth, deleteUserData);

export default router; 