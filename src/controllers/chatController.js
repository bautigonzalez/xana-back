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
}

export default new ChatController(); 