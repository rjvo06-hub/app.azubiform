import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { email, token, nombre } = req.body || {};

    const urlVerificacion = `https://app.azubiform.de/verificar.html?token=${token}`;
    const saludo = nombre ? `Hallo ${nombre}!` : `Hallo!`;
    const destinatario = email || 'info@azubiform.de';

    const data = await resend.emails.send({
      from: 'Azubiform <info@azubiform.de>',
      to: [destinatario],
      subject: 'Willkommen bei Azubiform! Starte jetzt mit deinem FOS-Praktikum',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 40px 0; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            
            <!-- Encabezado exclusivo para FOS (Verde esmeralda moderno) -->
            <div style="background-color: #047857; padding: 30px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Azubiform • FOS Praktikum</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Dein digitaler Begleiter für das FOS-Jahrespraktikum</p>
            </div>

            <!-- Cuerpo del mensaje -->
            <div style="padding: 40px 30px; color: #374151; line-height: 1.6;">
              <h2 style="color: #111827; font-size: 20px; margin-top: 0;">${saludo}</h2>
              <p style="margin-bottom: 25px;">Willkommen im Team! Du hast den Schritt in die FOS und dein Jahrespraktikum gewagt – eine spannende Zeit zwischen Schule und echter Arbeitswelt liegt vor dir.</p>
              
              <p style="margin-bottom: 25px;">Wir wissen, dass der Schulalltag und das Praktikum unter einen Hut zu bringen jede Menge Organisation erfordern. Damit du deinen <b>Tätigkeitsnachweis</b> mühelos und ohne Stress erledigen kannst, bist du bei Azubiform genau richtig.</p>

              <p style="margin-bottom: 25px;">Aktiviere jetzt deinen Account und starte direkt durch:</p>
              
              <!-- Botón de acción -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${urlVerificacion}" style="background-color: #047857; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 2px 4px rgba(4, 120, 87, 0.3);">FOS-Konto bestätigen</a>
              </div>

              <!-- Bloque informativo con tono de apoyo real para FOS -->
              <div style="background-color: #ecfdf5; border-left: 4px solid #047857; padding: 15px; border-radius: 4px; margin: 30px 0; font-size: 14px; color: #065f46;">
                💡 <b>FOS-Insider-Tipp:</b> Schreib dir deine Tätigkeiten am besten direkt nach jeder Woche auf. Mit unserem System hast du deinen <b>Tätigkeitsnachweis</b> für die Schule im Handumdrehen fertig und musst am Ende nicht alles auf den letzten Drücker zusammensuchen.
              </div>

              <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">Falls der Button nicht funktioniert, kopiere einfach diesen Link in deinen Browser:</p>
              <p style="font-size: 13px; word-break: break-all; margin-top: 0;"><a href="${urlVerificacion}" style="color: #047857; text-decoration: underline;">${urlVerificacion}</a></p>
            </div>

            <!-- Pie de página -->
            <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0;">Dies ist eine automatisierte Nachricht exklusiv für FOS-Praktikanten von Azubiform. Bitte antworte nicht auf diese E-Mail.</p>
            </div>

          </div>
        </div>
      `
    });

    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('Error detallado con Resend (FOS):', error);
    return res.status(500).json({ 
      error: error.message, 
      name: error.name 
    });
  }
}
