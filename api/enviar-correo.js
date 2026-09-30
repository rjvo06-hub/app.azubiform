import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Configurar CORS por si acaso
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { email, token } = req.method === 'POST' && req.body ? req.body : {};

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ionos.de',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Enviar correo de prueba o de verificación real
    const mailOptions = {
      from: `"Azubiform" <${process.env.SMTP_USER}>`,
      to: email || process.env.SMTP_USER,
      subject: 'Confirma tu cuenta en Azubiform',
      text: `Tu código de verificación es: ${token || 'Prueba de conexión exitosa'}`,
      html: `<p>Bienvenido a Azubiform. Tu enlace o código de verificación es: <b>${token || 'Conexión exitosa'}</b></p>`
    };

    const info = await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, messageId: info.messageId });

  } catch (error) {
    console.error('Error detallado en SMTP:', error);
    return res.status(500).json({ 
      error: error.message, 
      code: error.code, 
      stack: error.stack 
    });
  }
}
