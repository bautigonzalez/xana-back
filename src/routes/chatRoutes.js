import express from 'express';
import chatController from '../controllers/chatController.js';
import { requireAuth, optionalAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/analyze', optionalAuth, chatController.analyzeSymptoms);
router.get('/test', chatController.testConnection);
router.get('/info', chatController.getServiceInfo);
router.post('/filter-centers', chatController.filterMedicalCenters);
router.post('/recommend-centers', chatController.recommendMedicalCenters);

// Rutas de historial
router.get('/history', requireAuth, chatController.getHistory);
router.get('/history/:id', requireAuth, chatController.getChatMessages);
router.delete('/history/:id', requireAuth, chatController.deleteChat);

export default router; 