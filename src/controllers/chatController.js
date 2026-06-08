import aiService from '../services/aiService.js';

class ChatController {
  async analyzeSymptoms(req, res) {
    try {
      const { symptoms, userLocation, conversationHistory, chatId, image } = req.body;
      const user = req.user; // Viene del middleware de auth (passport)
      console.log(user)
      // 1. Validar síntomas
      if (!symptoms || typeof symptoms !== 'string') {
        return res.status(400).json({
          error: 'Síntomas requeridos',
          message: 'Debes proporcionar los síntomas a analizar'
        });
      }

      // Validación de peso máximo de seguridad para la imagen (250KB)
      // Un archivo de 250KB en Base64 es de unos ~340.000 a 350.000 caracteres.
      if (image && image.data) {
        if (image.data.length > 350000) {
          return res.status(400).json({
            error: 'Imagen demasiado grande',
            message: 'La imagen excede el límite permitido de 250KB'
          });
        }
      }

      console.log('🔍 Analizando:', symptoms.substring(0, 30) + '...', user ? `(User: ${user.id})` : '(Anon)');

      let currentChatId = chatId;
      let effectiveHistory = conversationHistory || [];
      let canSaveImage = true;

      // 2. Si el usuario está LOGUEADO, gestionar persistencia
      if (user) {
        const { pool } = await import('../config/database.js');

        if (currentChatId) {
          // Verificar que el chat pertenezca al usuario
          const chatResult = await pool.query('SELECT id FROM chats WHERE id = $1 AND user_id = $2', [currentChatId, user.id]);
          if (chatResult.rows.length === 0) {
            currentChatId = null;
          } else {
            // Rellenar historial desde DB para contexto
            const msgResult = await pool.query('SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [currentChatId]);
            effectiveHistory = msgResult.rows;

            // Verificar si este chat ya contiene alguna imagen guardada
            if (image) {
              const imageCheckResult = await pool.query(
                'SELECT id FROM messages WHERE chat_id = $1 AND image_data IS NOT NULL LIMIT 1',
                [currentChatId]
              );
              if (imageCheckResult.rows.length > 0) {
                console.log(`⚠️ Chat ${currentChatId} ya contiene una imagen. Se ignorará la nueva imagen.`);
                canSaveImage = false;
              }
            }
          }
        }

        if (!currentChatId) {
          // Crear nuevo chat
          const newChat = await pool.query('INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING id', [user.id, symptoms.substring(0, 50)]);
          currentChatId = newChat.rows[0].id;
        }

        // C. Guardar mensaje del USUARIO
        const imageDataUri = (image && canSaveImage) ? `data:${image.mimeType || 'image/jpeg'};base64,${image.data}` : null;
        await pool.query(
          'INSERT INTO messages (chat_id, role, content, image_data) VALUES ($1, $2, $3, $4)',
          [currentChatId, 'user', symptoms, imageDataUri]
        );
      }

      // 3. Consultar a la IA (usando el historial efectivo)
      const analysis = await aiService.analyzeSymptoms(
        symptoms,
        userLocation,
        effectiveHistory,
        image && canSaveImage ? image : null
      );

      // 4. Si logueado, Guardar respuesta de la IA
      if (user && currentChatId) {
        const { pool } = await import('../config/database.js');
        await pool.query('INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3)', [currentChatId, 'assistant', analysis.content]);
      }

      console.log('✅ Análisis completado. ChatID:', currentChatId);

      res.json({
        success: true,
        data: analysis,
        chatId: currentChatId
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

      const msgs = await pool.query('SELECT role, content, image_data, created_at FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [id]);

      res.json({ success: true, messages: msgs.rows });
    } catch (error) {
      console.error('❌ Error obteniendo mensajes:', error);
      res.status(500).json({ error: 'Error al obtener mensajes' });
    }
  }
}

export default new ChatController(); 