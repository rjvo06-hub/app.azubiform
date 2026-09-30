const nodemailer = require('nodemailer');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { email, nombre, token } = req.body;

    // Configuración ajustada para IONOS (Puerto 587 con TLS)
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ionos.de',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false, // false para el puerto 587 (TLS)
        auth: {
            user: info@azubiform.de,
            pass: F.Lissandra#1106
        },
        tls: {
            ciphers: 'SSLv3'
        }
    });

    const enlaceVerificacion = `https://app.azubiform.de/verificar.html?token=${token}`;

    try {
        await transporter.sendMail({
            from: '"Azubiform" <info@azubiform.de>',
            to: email,
            subject: 'Bestätige deine E-Mail-Adresse für Azubiform',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>Hallo ${nombre},</h2>
                    <p>Vielen Dank für deine Registrierung bei Azubiform. Bitte klicke auf den folgenden Link, um deine E-Mail-Adresse zu bestätigen und dein Konto zu aktivieren:</p>
                    <p style="margin: 20px 0;">
                        <a href="${enlaceVerificacion}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">E-Mail bestätigen</a>
                    </p>
                    <p>Wenn du das nicht warst, kannst du diese E-Mail einfach ignorieren.</p>
                </div>
            `
        });

        return res.status(200).json({ success: true, message: 'Correo enviado correctamente' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}