import { pool } from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
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