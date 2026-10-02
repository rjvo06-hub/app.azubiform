import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { email, token, nombre } = req.method === 'POST' && req.body ? req.body : {};

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

    const urlVerificacion = `https://app.azubiform.de/verificar.html?token=${token}`;
    const saludo = nombre ? `Hallo ${nombre}!` : `Hallo!`;

    const mailOptions = {
      from: `"Azubiform" <${process.env.SMTP_USER}>`,
      to: email || process.env.SMTP_USER,
      subject: 'Willkommen bei Azubiform! Bitte bestätige dein Konto',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 40px 0; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            
            <!-- Encabezado en Azul -->
            <div style="background-color: #2563eb; padding: 30px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Azubiform</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Digitale Führung deines Ausbildungsnachweises</p>
            </div>

            <!-- Cuerpo del mensaje -->
            <div style="padding: 40px 30px; color: #374151; line-height: 1.6;">
              <h2 style="color: #111827; font-size: 20px; margin-top: 0;">${saludo}</h2>
              <p style="margin-bottom: 25px;">Vielen Dank für deine Registrierung bei Azubiform. Wir freuen uns sehr, dich bei der Verwaltung deiner Ausbildung zu begleiten.</p>
              
              <p style="margin-bottom: 25px;">Um dein Konto zu aktivieren und deine E-Mail-Adresse zu bestätigen, klicke bitte einfach auf den folgenden Button:</p>
              
              <!-- Botón de acción en Azul -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${urlVerificacion}" style="background-color: #2563eb; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);">Konto bestätigen</a>
              </div>

              <!-- Bloque informativo optimizado -->
              <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; border-radius: 4px; margin: 30px 0; font-size: 14px; color: #1e40af;">
                💡 <b>Tipp:</b> Trage deine täglichen Aktivitäten ein und behalte deinen gesamten Verlauf im Blick. So kannst du deine Einträge jederzeit Monat für Monat ganz bequem abrufen!
              </div>

              <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">Falls der Button nicht funktioniert, kannst du auch den folgenden Link in deinen Browser kopieren:</p>
              <p style="font-size: 13px; word-break: break-all; margin-top: 0;"><a href="${urlVerificacion}" style="color: #2563eb; text-decoration: underline;">${urlVerificacion}</a></p>
            </div>

            <!-- Pie de página -->
            <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0;">Dies ist eine automatisierte Nachricht von Azubiform. Bitte antworte nicht auf diese E-Mail.</p>
            </div>

          </div>
        </div>
      `
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
