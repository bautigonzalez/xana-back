import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let transporterInstance = null;

// Enviar usando la API HTTP de Resend (evita bloqueo de puertos SMTP en Railway)
async function sendViaResendApi(apiKey, { to, subject, text, html }) {
  console.log('📨 Enviando email usando la API HTTP de Resend (Bypassing SMTP)...');
  // Resend requiere enviar desde un dominio verificado. De lo contrario, usar onboarding@resend.dev
  const fromEmail = process.env.SMTP_FROM || 'onboarding@resend.dev';
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        text,
        html
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || JSON.stringify(data));
    }

    console.log(`✉️ Email enviado con éxito vía Resend API a ${to}. ID: ${data.id}`);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Error enviando email con Resend API:', error.message);
    return { success: false, error: error.message };
  }
}

async function getTransporter() {
  if (transporterInstance) return transporterInstance;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    console.log('📨 Configurando Nodemailer con SMTP de Producción:', host);
    transporterInstance = nodemailer.createTransport({
      host,
      port: parseInt(port || '587'),
      secure: port === '465', // true para puerto 465, false para otros
      auth: { user, pass }
    });
  } else {
    console.log('📨 Creando cuenta de Ethereal Email de prueba (desarrollo)...');
    try {
      const testAccount = await Promise.race([
        nodemailer.createTestAccount(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout creating Ethereal account')), 5000))
      ]);
      transporterInstance = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('✅ Cuenta Ethereal creada. User:', testAccount.user);
    } catch (err) {
      console.error('⚠️ Error creando cuenta Ethereal, usando fallback de consola:', err.message);
      transporterInstance = {
        sendMail: async (mailOptions) => {
          console.log('\n=======================================');
          console.log('📨 [MOCK EMAIL] ENVIADO POR CONSOLA:');
          console.log('De:', mailOptions.from);
          console.log('Para:', mailOptions.to);
          console.log('Asunto:', mailOptions.subject);
          console.log('Texto:', mailOptions.text);
          console.log('=======================================\n');
          return { messageId: 'mock-id-' + Date.now() };
        }
      };
    }
  }
  return transporterInstance;
}

export async function sendEmail({ to, subject, text, html }) {
  const resendApiKey = process.env.RESEND_API_KEY || (process.env.SMTP_PASS?.startsWith('re_') ? process.env.SMTP_PASS : null);

  if (resendApiKey) {
    return sendViaResendApi(resendApiKey, { to, subject, text, html });
  }

  try {
    const transporter = await getTransporter();
    const fromEmail = process.env.SMTP_FROM || '"Soporte Xana" <no-reply@xana.app>';
    
    const info = await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      text,
      html
    });

    console.log(`✉️ Email enviado con éxito a ${to}. MessageId: ${info.messageId}`);
    
    // Si es Ethereal (no SMTP real), mostrar la URL de previsualización en consola
    if (info.messageId && !hostConfigured()) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('\n=======================================');
        console.log('👉 PREVISUALIZAR EMAIL EN TU NAVEGADOR:');
        console.log(previewUrl);
        console.log('=======================================\n');
      }
    }
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error enviando email con Nodemailer:', error);
    return { success: false, error: error.message };
  }
}

function hostConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
