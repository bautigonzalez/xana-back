import { pool } from './database.js';

export const initDatabase = async () => {
  try {
    // Tabla de usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        provider VARCHAR(50) DEFAULT 'email',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de sesiones/tokens (opcional, para refresh tokens)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de preferencias de usuario (opcional)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        notifications BOOLEAN DEFAULT true,
        location_sharing BOOLEAN DEFAULT true,
        theme VARCHAR(20) DEFAULT 'light',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de favoritos (opcional)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        place_id VARCHAR(255) NOT NULL,
        place_name VARCHAR(255) NOT NULL,
        place_type VARCHAR(50) NOT NULL,
        address TEXT,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        rating DECIMAL(3, 2) DEFAULT 0,
        open_now BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_place UNIQUE (user_id, place_id)
      )
    `);

    // Migración/Alteración segura para base de datos ya existente
    await pool.query(`
      ALTER TABLE user_favorites ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2) DEFAULT 0;
      ALTER TABLE user_favorites ADD COLUMN IF NOT EXISTS open_now BOOLEAN DEFAULT false;
    `);

    await pool.query(`
      ALTER TABLE user_favorites ADD CONSTRAINT unique_user_place UNIQUE (user_id, place_id);
    `).catch(err => {
      // Ignorar error si el constraint ya existe (error 42710 en postgres)
      if (err.code !== '42710') {
        console.error('Error adding unique constraint to user_favorites:', err);
      }
    });


    // Tabla de CHATS (Historial de conversaciones)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) DEFAULT 'Nueva Consulta',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de MENSAJES de los chats
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migración/Alteración segura para agregar columna image_data
    await pool.query(`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_data TEXT;
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await pool.end();
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase();
} 