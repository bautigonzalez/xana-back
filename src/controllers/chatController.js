import aiService from '../services/aiService.js';

class ChatController {
  async analyzeSymptoms(req, res) {
    try {
      const { symptoms, userLocation, conversationHistory } = req.body;
      if (!symptoms || typeof symptoms !== 'string') {
        return res.status(400).json({
          error: 'Síntomas requeridos',
          message: 'Debes proporcionar los síntomas a analizar'
        });
      }
      console.log('🔍 Analizando síntomas:', symptoms.substring(0, 50) + '...');
      const analysis = await aiService.analyzeSymptoms(
        symptoms, 
        userLocation, 
        conversationHistory || []
      );
      console.log('✅ Análisis completado');
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('❌ Error en análisis de síntomas:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        message: error.message || 'Error procesando la solicitud'
      });
    }
  }

  async testConnection(req, res) {
    try {
      const isConnected = await aiService.testGeminiConnection();
      res.json({
        success: true,
        connected: isConnected,
        message: isConnected ? 'IA conectada correctamente' : 'Error de conexión con IA'
      });
    } catch (error) {
      console.error('❌ Error probando conexión IA:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        message: error.message || 'Error probando conexión'
      });
    }
  }

  async getServiceInfo(req, res) {
    try {
      const isConnected = await aiService.testGeminiConnection();
      res.json({
        success: true,
        service: 'Xana AI Chat Service',
        connected: isConnected,
        features: [
          'Análisis de síntomas',
          'Evaluación de urgencia',
          'Recomendaciones médicas',
          'Identificación de especialidades',
          'Historial de conversación'
        ],
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error obteniendo información del servicio:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        message: error.message || 'Error obteniendo información'
      });
    }
  }

  async filterMedicalCenters(req, res) {
    try {
      const { places } = req.body;
      if (!Array.isArray(places) || places.length === 0) {
        return res.status(400).json({
          error: 'Lista de lugares requerida',
          message: 'Debes enviar un array de lugares a filtrar'
        });
      }
      const filtered = await aiService.filterValidMedicalCentersWithAI(places);
      res.json({ success: true, data: filtered });
    } catch (error) {
      console.error('❌ Error filtrando centros médicos:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        message: error.message || 'Error procesando la solicitud'
      });
    }
  }

  async recommendMedicalCenters(req, res) {
    try {
      const { places, conversationHistory } = req.body;
      if (!Array.isArray(places) || places.length === 0) {
        return res.status(400).json({
          error: 'Lista de lugares requerida',
          message: 'Debes enviar un array de lugares cercanos para recomendar'
        });
      }
      // Lógica principal delegada al servicio
      const result = await aiService.recommendMedicalCenters(places, conversationHistory || []);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('❌ Error recomendando centros médicos:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        message: error.message || 'Error procesando la solicitud'
      });
    }
  }
}

export default new ChatController(); 