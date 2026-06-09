import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let transporterInstance = null;

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
      const testAccount = await nodemailer.createTestAccount();
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
      console.error('⚠️ Error creando cuenta Ethereal, usando fallback de consola:', err);
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
