import fetch from 'node-fetch';
// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config();

class AIService {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.initGemini();
  }

  // Inicializar Gemini solo si hay API key
  initGemini() {
    if (this.geminiApiKey) {
      console.log('✅ Gemini API key configurada');
    } else {
      console.log('⚠️ No hay API key de Gemini configurada');
    }
  }

  // Analizar síntomas y generar recomendaciones
  async analyzeSymptoms(symptoms, userLocation = null, conversationHistory = []) {
    // Validación de ruido o mensaje sin sentido
    const isGibberish = (text) => {
      const clean = text.trim().toLowerCase().replace(/\s+/g, ' ');
      if (clean.length <= 20) return false;
      const whitelist = ['hola', 'hola xana', 'buenas', 'buenos días', 'buenas tardes', 'buenas noches', 'saludos', 'hey'];
      if (whitelist.some(w => clean === w)) return false;
      if (clean.length > 30 && !clean.includes(' ')) return true;
      const words = clean.split(/\s+/);
      const longNoVowel = words.filter(w => w.length >= 8 && !/[aeiouáéíóú]/.test(w));
      if (words.length > 2 && longNoVowel.length / words.length > 0.7) return true;
      return false;
    };

    if (isGibberish(symptoms)) {
      return {
        content: '<p><strong>Lo siento, no logré entender tu mensaje. ¿Podrías escribirlo de nuevo o explicarlo con otras palabras?</strong></p>',
        specialties: [],
        urgency: undefined,
        recommendations: [],
        accion: undefined
      };
    }

    try {
      if (!this.geminiApiKey) {
        throw new Error('No hay API key de Gemini configurada');
      }

      const prompt = this.buildMedicalPrompt(symptoms, userLocation, conversationHistory);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 400,
            topP: 0.8,
            topK: 40
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error completo de Gemini:', errorText);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                        "Basándome en tus síntomas, te recomiendo consultar con un médico.";
      
      const parsedResponse = this.parseJSONResponse(aiResponse);
      
      return {
        content: parsedResponse.formattedContent,
        specialties: parsedResponse.especialidades,
        urgency: parsedResponse.urgencia,
        recommendations: parsedResponse.recomendaciones,
        accion: parsedResponse.accion
      };

    } catch (error) {
      console.error('Error con Gemini API:', error);
      throw error;
    }
  }

  buildMedicalPrompt(symptoms, userLocation, conversationHistory) {
    let prompt = `Eres un asistente médico virtual experto. Analiza los síntomas y devuelve una respuesta en formato JSON estructurado.

IMPORTANTE:
- Si el usuario solo saluda (por ejemplo: "hola", "buenos días", "hola cómo estás", etc.), responde SOLO con el mensaje de bienvenida de Xana, cálido y profesional, con las viñetas de funcionalidades. NO incluyas urgencia, recomendaciones ni especialidades. Ejemplo:
{
  "mensaje_principal": "<strong>¡Hola! 😊 Soy Xana, tu asistente médico virtual.</strong><br><br>Gracias por tu saludo. Estoy aquí para ayudarte. Puedes:<br><ul><li>🩺 Contarme cómo te sientes o describir tus síntomas.</li><li>🏥 Pedirme ayuda para encontrar centros médicos cercanos.</li><li>💊 Consultarme sobre farmacias próximas a tu ubicación.</li></ul>¿En qué puedo ayudarte hoy?"
}

- Si el usuario pregunta por farmacias cercanas, dónde comprar medicamentos, o frases similares (por ejemplo: "dime farmacias cercanas", "dónde puedo comprar medicina", "farmacias abiertas", etc.), responde SOLO con un mensaje profesional y directo sobre farmacias cercanas, por ejemplo: "¡Por supuesto! Aquí tienes un acceso directo para ver farmacias cercanas a tu ubicación." y el campo especial: "accion": "mostrar_farmacias". NO incluyas el saludo ni las viñetas, ni urgencia, recomendaciones ni especialidades. Ejemplo:
{
  "mensaje_principal": "¡Por supuesto! Aquí tienes un acceso directo para ver farmacias cercanas a tu ubicación.",
  "accion": "mostrar_farmacias"
}

${conversationHistory.length > 0 ? `HISTORIAL DE CONVERSACIÓN:
${conversationHistory.map(msg => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`).join('\n')}

` : ''}SÍNTOMAS ACTUALES: "${symptoms}"

${userLocation ? `UBICACIÓN: ${userLocation.lat}, ${userLocation.lng}` : ''}

EVALÚA LA URGENCIA:
- ALTO: Dolor intenso, sangrado abundante, dificultad para respirar, pérdida de consciencia, traumatismos graves, fracturas
- MEDIO: Síntomas que requieren atención pronto pero no son inmediatamente peligrosos
- BAJO: Problemas menores que pueden esperar

DEBES RESPONDER ÚNICAMENTE CON UN JSON EN ESTE FORMATO EXACTO:

{
  "urgencia": "ALTO|MEDIO|BAJO",
  "explicacion_urgencia": "Explicación breve de por qué es esta urgencia",
  "mensaje_principal": "Mensaje principal amigable, empático, tranquilizador y conversacional",
  "recomendaciones": [
    "Recomendación 1 específica",
    "Recomendación 2 específica",
    "Recomendación 3 específica"
  ],
  "especialidades": [
    "Especialidad 1",
    "Especialidad 2"
  ]
}

IMPORTANTE:
- Si el usuario solo saluda, responde como se indicó arriba y NO incluyas urgencia, explicaciones, recomendaciones ni especialidades.
- Si el usuario pregunta por farmacias, responde como se indicó arriba (mensaje directo + acceso) y NO incluyas urgencia, explicaciones, recomendaciones ni especialidades.
- Responde SOLO con el JSON, sin texto adicional
- El mensaje_principal debe ser profesional y claro
- Las recomendaciones deben ser acciones específicas y concretas
- Máximo 3 recomendaciones y 2 especialidades
- Mantén el contexto de la conversación anterior
- No diagnostiques enfermedades específicas
- Siempre recomienda consultar con un profesional
- NO incluyas información adicional fuera del JSON

Responde únicamente con el JSON.`;

    return prompt;
  }

  parseJSONResponse(aiResponse) {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontró JSON válido en la respuesta');
      }

      const jsonData = JSON.parse(jsonMatch[0]);
      const formattedContent = this.formatJSONToHTML(jsonData);
      return {
        urgencia: jsonData.urgencia?.toLowerCase() || 'medio',
        especialidades: jsonData.especialidades || ['Medicina General'],
        recomendaciones: jsonData.recomendaciones || ['Consulta con un profesional de la salud'],
        formattedContent: formattedContent,
        accion: jsonData.accion || undefined
      };
    } catch (error) {
      console.error('Error parseando JSON de Gemini:', error);
      return {
        urgencia: 'medio',
        especialidades: ['Medicina General'],
        recomendaciones: ['Consulta con un profesional de la salud'],
        formattedContent: '<p><strong>Lo siento, tuve un problema procesando tu consulta. Por favor, intenta de nuevo.</strong></p>'
      };
    }
  }

  formatJSONToHTML(jsonData) {
    let html = '';
    if (jsonData.mensaje_principal) {
      html += `<p>${jsonData.mensaje_principal}</p>`;
    }
    if (jsonData.urgencia && jsonData.explicacion_urgencia) {
      html += `<p><strong>Nivel de urgencia: ${jsonData.urgencia.toUpperCase()}</strong> - ${jsonData.explicacion_urgencia}</p>`;
    }
    if (jsonData.recomendaciones && jsonData.recomendaciones.length > 0) {
      html += '<p><strong>Acciones recomendadas:</strong></p><ul>';
      jsonData.recomendaciones.forEach(rec => {
        html += `<li>${rec}</li>`;
      });
      html += '</ul>';
    }
    if (jsonData.especialidades && jsonData.especialidades.length > 0) {
      html += `<p><strong>Especialidades médicas:</strong> ${jsonData.especialidades.join(', ')}</p>`;
    }
    return html;
  }

  async testGeminiConnection() {
    if (!this.geminiApiKey) {
      return false;
    }
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "Test message"
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 10,
            topP: 0.8,
            topK: 40
          }
        })
      });
      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error en prueba de conexión Gemini:', error);
      return false;
    }
  }

  // Filtrar lugares usando IA (Gemini)
  async filterValidMedicalCentersWithAI(places) {
    try {
      const limitedPlaces = places.slice(0, 20);
      const names = limitedPlaces.map(place => ({ id: place.place_id || place.id, name: place.name }));
      const prompt = `Analiza esta lista de lugares y responde SOLO con un array JSON de los IDs de los que sean EXCLUSIVAMENTE centros médicos, hospitales, clínicas, consultorios o farmacias reales.

REGLAS ESTRICTAS:
- INCLUIR solo: hospitales, clínicas, centros médicos, consultorios médicos, farmacias, laboratorios médicos
- EXCLUIR: talleres, gomerías, comercios, bancos, escuelas, iglesias, oficinas, estaciones de servicio, cualquier lugar no médico
- Si el nombre contiene palabras como "taller", "moto", "auto", "gomería", "comercio", "banco", "escuela", "iglesia", etc., NO incluirlo
- Si tienes dudas sobre si es médico o no, NO incluirlo

IMPORTANTE: Responde SOLO con el array JSON, sin ningún texto adicional ni bloques de código.

Lista de lugares:
${JSON.stringify(names, null, 2)}
`;
      const aiResponse = await this.callGemini(prompt);
      let responseText = aiResponse;
      if (typeof aiResponse === 'object' && aiResponse.candidates) {
        responseText = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
      let validIds = [];
      try {
        let cleanText = responseText;
        cleanText = cleanText.replace(/^```json\s*/i, '');
        cleanText = cleanText.replace(/\s*```$/i, '');
        cleanText = cleanText.replace(/^```\s*/i, '');
        const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
        let jsonString = null;
        if (arrayMatch) {
          jsonString = arrayMatch[0];
          // Si el array no termina en ] intentar cerrarlo
          if (!jsonString.trim().endsWith(']')) {
            const lastQuote = jsonString.lastIndexOf('"');
            if (lastQuote !== -1) {
              jsonString = jsonString.slice(0, lastQuote + 1) + ']';
            } else {
              jsonString += ']';
            }
          }
        } else {
          // Si no hay array, intentar parsear todo
          jsonString = cleanText;
        }
        try {
          validIds = JSON.parse(jsonString);
        } catch (innerError) {
          // Si falla, intentar extraer IDs con regex
          const idRegex = /"([^"]+)"/g;
          let match;
          validIds = [];
          while ((match = idRegex.exec(jsonString)) !== null) {
            validIds.push(match[1]);
          }
        }
      } catch (parseError) {
        console.error('Error parseando respuesta de Gemini:', parseError);
        // fallback: devolver todos los lugares
        return places;
      }
      if (!Array.isArray(validIds) || validIds.length === 0) {
        return places;
      }
      const filteredPlaces = limitedPlaces.filter(place => validIds.includes(place.place_id || place.id));
      // Filtro adicional de respaldo para excluir lugares no médicos
      const nonMedicalKeywords = [
        'taller', 'moto', 'auto', 'vehículo', 'vehiculo', 'gomería', 'gomeria', 'lubricentro', 'garage',
        'comercio', 'banco', 'escuela', 'colegio', 'universidad', 'iglesia', 'templo', 'oficina',
        'estación', 'estacion', 'servicio técnico', 'servicio tecnico', 'electrónica', 'electronica',
        'computadora', 'pc', 'informática', 'informatica', 'repuesto', 'accesorio', 'accesorios'
      ];
      const finalFilteredPlaces = filteredPlaces.filter(place => {
        const nameLower = place.name.toLowerCase();
        return !nonMedicalKeywords.some(keyword => nameLower.includes(keyword));
      });
      if (finalFilteredPlaces.length < Math.max(1, limitedPlaces.length * 0.1)) {
        return limitedPlaces;
      }
      return finalFilteredPlaces;
    } catch (error) {
      console.error('Error filtrando lugares con Gemini:', error);
      return places;
    }
  }

  // Llamada genérica a Gemini (para prompts custom)
  async callGemini(prompt) {
    if (!this.geminiApiKey) throw new Error('No hay API key de Gemini configurada');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
          topP: 0.8,
          topK: 40
        }
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    return data;
  }
}

export default new AIService(); 