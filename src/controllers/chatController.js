import aiService from '../services/aiService.js';

class ChatController {
  async analyzeSymptoms(req, res) {
    try {
      const { symptoms, userLocation, conversationHistory, chatId } = req.body;
      const user = req.user; // Viene del middleware de auth (passport)
      console.log(user)
      // 1. Validar síntomas
      if (!symptoms || typeof symptoms !== 'string') {
        return res.status(400).json({
          error: 'Síntomas requeridos',
          message: 'Debes proporcionar los síntomas a analizar'
        });
      }

      console.log('🔍 Analizando:', symptoms.substring(0, 30) + '...', user ? `(User: ${user.id})` : '(Anon)');

      let currentChatId = chatId;
      let effectiveHistory = conversationHistory || [];

      // 2. Si el usuario está LOGUEADO, gestionar persistencia
      if (user) {
        // A. Obtener o Crear Chat
        // Importamos pool dinámicamente o lo inyectamos (aquí asumo import arriba, lo agregaré)
        const { pool } = await import('../config/database.js');

        if (currentChatId) {
          // Verificar que el chat pertenezca al usuario
          const chatResult = await pool.query('SELECT id FROM chats WHERE id = $1 AND user_id = $2', [currentChatId, user.id]);
          if (chatResult.rows.length === 0) {
            // Si el chat no existe o no es suyo, forzamos uno nuevo (o error, pero mejor nuevo para resiliencia)
            currentChatId = null;
          } else {
            // B. Rellenar historial desde DB para contexto
            const msgResult = await pool.query('SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [currentChatId]);
            effectiveHistory = msgResult.rows;
          }
        }

        if (!currentChatId) {
          // Crear nuevo chat
          // Título simplificado por ahora, luego se podría generar con IA
          const newChat = await pool.query('INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING id', [user.id, symptoms.substring(0, 50)]);
          currentChatId = newChat.rows[0].id;
        }

        // C. Guardar mensaje del USUARIO
        await pool.query('INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3)', [currentChatId, 'user', symptoms]);
      }

      // 3. Consultar a la IA (usando el historial efectivo)
      const analysis = await aiService.analyzeSymptoms(
        symptoms,
        userLocation,
        effectiveHistory
      );

      // 4. Si logueado, Guardar respuesta de la IA
      if (user && currentChatId) {
        const { pool } = await import('../config/database.js');
        // Guardamos el HTML formateado o un resumen. Idealmente el contenido raw, pero aquí analysis tiene estructura.
        // Guardaremos analysis.content que es el HTML formatted, o analysis.mensaje_principal si preferimos raw.
        // Para consistencia visual, guardamos el HTML que mostramos.
        await pool.query('INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3)', [currentChatId, 'assistant', analysis.content]);
      }

      console.log('✅ Análisis completado. ChatID:', currentChatId);

      res.json({
        success: true,
        data: analysis,
        chatId: currentChatId // Devolvemos el ID para que el front lo use en el siguiente mensaje
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

  // --- NUEVOS MÉTODOS PARA HISTORIAL ---

  async getHistory(req, res) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' });
      }
      const { pool } = await import('../config/database.js');

      const result = await pool.query(`
        SELECT id, title, created_at 
        FROM chats 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `, [user.id]);

      res.json({ success: true, chats: result.rows });
    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      res.status(500).json({ error: 'Error al obtener historial' });
    }
  }

  async getChatMessages(req, res) {
    try {
      const user = req.user;
      const { id } = req.params;
      if (!user) return res.status(401).json({ error: 'No autorizado' });

      const { pool } = await import('../config/database.js');

      // Verificar pertenencia
      const chatCheck = await pool.query('SELECT id FROM chats WHERE id = $1 AND user_id = $2', [id, user.id]);
      if (chatCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Chat no encontrado' });
      }

      const msgs = await pool.query('SELECT role, content, created_at FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [id]);

      res.json({ success: true, messages: msgs.rows });
    } catch (error) {
      console.error('❌ Error obteniendo mensajes:', error);
      res.status(500).json({ error: 'Error al obtener mensajes' });
    }
  }
}

export default new ChatController(); 