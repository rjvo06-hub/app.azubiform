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
    const { email, nombre, tipo, profesion } = req.body || {};

    // Detectar si es FOS o Ausbildung para el asunto
    const esFos = tipo && tipo.toLowerCase().includes('fos');
    const categoria = esFos ? 'FOS' : 'Ausbildung';

    const data = await resend.emails.send({
      from: 'Azubiform System <info@azubiform.de>',
      to: ['azubiform@gmail.com'],
      subject: `Nuevo usuario (${categoria}) - ${nombre || 'Sin nombre'}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">¡Tienes un nuevo usuario confirmado!</h2>
          <p>Un usuario acaba de verificar su correo y activar su cuenta en Azubiform:</p>
          <ul style="line-height: 1.6;">
            <li><b>Tipo:</b> ${categoria}</li>
            <li><b>Nombre:</b> ${nombre || 'No especificado'}</li>
            <li><b>Correo:</b> ${email}</li>
            <li><b>Profesión:</b> ${profesion || 'No especificada'}</li>
          </ul>
        </div>
      `
    });

    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('Error enviando correo al admin:', error);
    return res.status(500).json({ error: error.message });
  }
}
