import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Opción A: Si quieres que lea de una ruta fija en tu disco C (solo para pruebas locales en Windows):
    // const filePath = 'C:\\recibo\\recibo.html';

    // Opción B (Recomendada): Leer automáticamente el archivo desde la raíz de tu proyecto
    const filePath = path.join(process.cwd(), 'recibo.html');

    // Verifica si el archivo existe antes de leerlo
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'No se encontró el archivo recibo.html en la carpeta especificada.' });
    }

    // Lee el archivo HTML automáticamente
    const htmlContent = fs.readFileSync(filePath, 'utf8');

    // Extraemos de manera automática el destinatario y el asunto que pusiste dentro del archivo HTML
    // Buscamos el bloque <div id="meta-correo"> que añadimos antes
    let destinatario = 'rjvo06@gmail.com'; // Correo por defecto si no lo encuentra
    let asunto = 'Recibo de Condominio - Edificio Perú (30-06-2023)';

    // Extracción automática del destinatario usando expresiones regulares en el HTML
    const matchDest = htmlContent.match(/<span class="destinatario">(.*?)<\/span>/);
    if (matchDest && matchDest[1]) {
      destinatario = matchDest[1].trim();
    }

    // Extracción automática del asunto
    const matchAsunto = htmlContent.match(/<span class="asunto">(.*?)<\/span>/);
    if (matchAsunto && matchAsunto[1]) {
      asunto = matchAsunto[1].trim();
    }

    // Envía el correo usando Resend con los datos extraídos automáticamente del archivo
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
      message: `Recibo tomado y enviado automáticamente a ${destinatario}`, 
      data 
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
