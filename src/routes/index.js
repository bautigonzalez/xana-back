import express from 'express';
import chatRoutes from './chatRoutes.js';
import authRoutes from './authRoutes.js';
import favoriteRoutes from './favoriteRoutes.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: 'Xana API is running! 🚀',
    version: '1.0.0',
    endpoints: {
      chat: {
        analyze: 'POST /chat/analyze',
        test: 'GET /chat/test',
        info: 'GET /chat/info'
      },
      favorites: {
        list: 'GET /favorites',
        add: 'POST /favorites',
        remove: 'DELETE /favorites/:place_id'
      },
      pharmacies: '/pharmacies',
      centers: '/centers',
      health: '/health'
    },
    timestamp: new Date().toISOString()
  });
});

router.use('/chat', chatRoutes);
router.use('/auth', authRoutes);
router.use('/favorites', favoriteRoutes);

router.get('/pharmacies', (req, res) => {
  res.json({
    message: 'Farmacias endpoint - Coming soon!',
    data: []
  });
});

router.get('/centers', (req, res) => {
  res.json({
    message: 'Centros médicos endpoint - Coming soon!',
    data: []
  });
});

router.get('/auth', (req, res) => {
  res.json({
    message: 'Auth endpoints - Coming soon!',
    endpoints: {
      login: 'POST /auth/login',
      register: 'POST /auth/register',
      profile: 'GET /auth/profile',
      logout: 'POST /auth/logout'
    }
  });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Xana API',
    timestamp: new Date().toISOString()
  });
});

export default router; 