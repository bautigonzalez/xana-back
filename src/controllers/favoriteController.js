import { pool } from '../config/database.js';

// Obtener todos los favoritos del usuario
export async function getFavorites(req, res) {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT * FROM user_favorites WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    // Mapeamos los resultados para asegurar compatibilidad de tipos con la app
    const favorites = result.rows.map(row => ({
      id: row.id, // Nuestro propio ID (DB serial)
      place_id: row.place_id, // El ID externo de Google Maps
      name: row.place_name,
      address: row.address,
      place_type: row.place_type,
      location: {
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude)
      },
      rating: parseFloat(row.rating || 0),
      open: row.open_now
    }));

    res.json({ favorites });
  } catch (err) {
    console.error('Error fetching favorites:', err);
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
}

// Agregar un favorito
export async function addFavorite(req, res) {
  const userId = req.user.id;
  const {
    place_id,
    place_name,
    place_type,
    address,
    latitude,
    longitude,
    rating,
    open_now
  } = req.body;

  if (!place_id || !place_name || !place_type) {
    return res.status(400).json({ error: 'place_id, place_name y place_type son campos requeridos' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO user_favorites 
       (user_id, place_id, place_name, place_type, address, latitude, longitude, rating, open_now) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       ON CONFLICT (user_id, place_id) 
       DO UPDATE SET 
         place_name = EXCLUDED.place_name,
         address = EXCLUDED.address,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         rating = EXCLUDED.rating,
         open_now = EXCLUDED.open_now
       RETURNING *`,
      [
        userId,
        place_id,
        place_name,
        place_type,
        address,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null,
        rating ? parseFloat(rating) : 0,
        open_now === true
      ]
    );

    const saved = result.rows[0];
    const favorite = {
      id: saved.id, // Nuestro propio ID (DB serial)
      place_id: saved.place_id, // El ID externo de Google Maps
      name: saved.place_name,
      address: saved.address,
      place_type: saved.place_type,
      location: {
        lat: parseFloat(saved.latitude),
        lng: parseFloat(saved.longitude)
      },
      rating: parseFloat(saved.rating || 0),
      open: saved.open_now
    };

    res.status(201).json({ success: true, favorite });
  } catch (err) {
    console.error('Error adding favorite:', err);
    res.status(500).json({ error: 'Error al agregar favorito' });
  }
}

// Eliminar un favorito
export async function removeFavorite(req, res) {
  const userId = req.user.id;
  const { place_id } = req.params;

  if (!place_id) {
    return res.status(400).json({ error: 'place_id es requerido' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM user_favorites WHERE user_id = $1 AND place_id = $2 RETURNING *',
      [userId, place_id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'El favorito no existe o no pertenece al usuario' });
    }

    const deleted = result.rows[0];
    res.json({ 
      success: true, 
      message: 'Favorito eliminado', 
      place_id: deleted.place_id 
    });
  } catch (err) {
    console.error('Error removing favorite:', err);
    res.status(500).json({ error: 'Error al eliminar favorito' });
  }
}
