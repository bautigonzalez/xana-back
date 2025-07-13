import express from 'express';
import chatController from '../controllers/chatController.js';

const router = express.Router();

router.post('/analyze', chatController.analyzeSymptoms);
router.get('/test', chatController.testConnection);
router.get('/info', chatController.getServiceInfo);
router.post('/filter-centers', chatController.filterMedicalCenters);
router.post('/recommend-centers', chatController.recommendMedicalCenters);

export default router; 