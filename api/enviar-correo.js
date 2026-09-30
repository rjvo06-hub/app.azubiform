import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405.1).json({ error: 'Método no permitido' });
  }

  try {
    // 1. Configurar el transportador con las variables de Vercel
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // smtp.ionos.de
      port: Number(process.env.SMTP_PORT), // 587
      secure: false, // false para puerto 587 con STARTTLS
      auth: {
        user: process.env.SMTP_USER, // info@azubiform.de
        pass: process.env.SMTP_PASS, // Tu contraseña de IONOS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // 2. Verificar la conexión con el servidor SMTP antes de enviar
    await transporter.verify();
    console.log('Conexión SMTP exitosa con IONOS');

    // 3. Intentar enviar un correo de prueba básico
    const info = await transporter.sendMail({
      from: `"Azubiform" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Te lo mandas a ti mismo para probar
      subject: 'Prueba de conexión SMTP - Azubiform',
      text: 'Si recibes este correo, la conexión con IONOS funciona perfectamente.',
    });

    return res.status(200).json({ success: true, messageId: info.messageId });

  } catch (error) {
    console.error('Error detallado de SMTP:', error);
    return res.status(500).json({ 
      error: 'Fallo en el servidor SMTP', 
      detalle: error.message,
      code: error.code,
      command: error.command
    });
  }
}
