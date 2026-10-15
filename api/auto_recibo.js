import { Resend } from 'resend';
import fs from 'fs';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Ruta exacta a tu archivo dentro de la carpeta recibo en el disco C
    const filePath = 'C:\\recibo\\recibo.html';

    // Verifica si el archivo existe en esa ruta
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'No se encontró el archivo recibo.html en C:\\recibo\\' });
    }

    // Lee el archivo HTML automáticamente desde tu disco C
    const htmlContent = fs.readFileSync(filePath, 'utf8');

    // Extracción automática del destinatario y asunto desde el HTML
    let destinatario = 'rjvo06@gmail.com'; 
    let asunto = 'Recibo de Condominio - Edificio Perú (30-06-2023)';

    const matchDest = htmlContent.match(/<span class="destinatario">(.*?)<\/span>/);
    if (matchDest && matchDest[1]) {
      destinatario = matchDest[1].trim();
    }

    const matchAsunto = htmlContent.match(/<span class="asunto">(.*?)<\/span>/);
    if (matchAsunto && matchAsunto[1]) {
      asunto = matchAsunto[1].trim();
    }

    // Envía el correo usando Resend con el contenido leído directamente de tu disco C
    const { data, error } = await resend.emails.send({
      from: 'Residencias Perú <info@azubiform.de>',
      to: [destinatario],
      subject: asunto,
      html: htmlContent
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ 
      success: true, 
      message: `Recibo leído de C:\\recibo\\recibo.html y enviado con éxito a ${destinatario}`, 
      data 
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
