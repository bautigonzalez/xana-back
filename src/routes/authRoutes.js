import express from 'express';
import { register, login, me } from '../controllers/authController.js';
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
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false
}));

// Google OAuth2 callback
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/' }), (req, res) => {
  // Generar JWT y redirigir al frontend con el token
  const token = generateToken(req.user);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  // Puedes enviar el token como query param o en localStorage usando window.opener
  res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
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

export default router; 