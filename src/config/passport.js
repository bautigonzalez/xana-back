import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { pool } from './database.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(user) {
  return jwt.sign({
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider
  }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Buscar si el usuario ya existe
    let result = await pool.query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [profile.id, profile.emails[0].value]);
    let user = result.rows[0];
    if (!user) {
      // Crear nuevo usuario
      result = await pool.query(
        'INSERT INTO users (google_id, email, name, avatar_url, provider) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [profile.id, profile.emails[0].value, profile.displayName, profile.photos?.[0]?.value, 'google']
      );
      user = result.rows[0];
    } else if (!user.google_id) {
      // Usuario existe pero no tiene google_id, actualizarlo
      result = await pool.query(
        'UPDATE users SET google_id = $1, avatar_url = $2, provider = $3 WHERE id = $4 RETURNING *',
        [profile.id, profile.photos?.[0]?.value, 'google', user.id]
      );
      user = result.rows[0];
    }
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

export { passport, generateToken }; 