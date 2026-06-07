import express from 'express';
import { getFavorites, addFavorite, removeFavorite } from '../controllers/favoriteController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Obtener todos los favoritos del usuario autenticado
router.get('/', requireAuth, getFavorites);

// Agregar un favorito
router.post('/', requireAuth, addFavorite);

// Eliminar un favorito
router.delete('/:place_id', requireAuth, removeFavorite);

export default router;
