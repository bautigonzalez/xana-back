const express = require('express');
const router = express.Router();

// Ruta principal de la API
router.get('/', (req, res) => {
  res.json({
    message: 'Xana API is running! 🚀',
    version: '1.0.0',
    endpoints: {
      pharmacies: '/pharmacies',
      centers: '/centers',
      health: '/health'
    },
    timestamp: new Date().toISOString()
  });
});

// Endpoint de farmacias (placeholder)
router.get('/pharmacies', (req, res) => {
  res.json({
    message: 'Farmacias endpoint - Coming soon!',
    data: []
  });
});

// Endpoint de centros médicos (placeholder)
router.get('/centers', (req, res) => {
  res.json({
    message: 'Centros médicos endpoint - Coming soon!',
    data: []
  });
});

// Endpoint de salud de la API
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Xana API',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 