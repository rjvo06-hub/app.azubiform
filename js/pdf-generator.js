import { SUPABASE_URL, headers } from './config.js';

export async function generarPdfRellenadoParaImprimir(codigoPlantilla, nombreUsuario, semanaInicio, semanaFin, supabaseClient) {
    try {
        // 1. Obtener las coordenadas/cajas mapeadas de la plantilla desde Supabase
        const { data: plantillaData, error: errPlantilla } = await supabaseClient
            .from('plantillas_pdf')
            .select('*')
            .eq('codigo', codigoPlantilla)
            .single();

        if (errPlantilla || !plantillaData) {
            alert("❌ Vorlage nicht gefunden. Bitte konfiguriere zuerst die Vorlage.");
            return;
        }

        const cajas = plantillaData.coordenadas;

        // 2. Descargar el archivo PDF en blanco original (puedes guardarlo en Supabase Storage o cargarlo localmente)
        // Supongamos que guardas el PDF en blanco en Supabase Storage con el nombre del código
        const { data: pdfBlob, error: errStorage } = await supabaseClient
            .storage
            .from('plantillas')
            .download(`${codigoPlantilla}.pdf`);

        if (errStorage) throw new Error("Fehler beim Herunterladen der leeren PDF-Vorlage.");

        const arrayBuffer = await pdfBlob.arrayBuffer();

        // 3. Cargar el PDF usando pdf-lib
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        const primeraPagina = pages[0];

        // Opcional: incrustar una fuente estándar limpia (como Helvetica)
        const fuenteNormal = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        const fontSize = 9;

        // 4. Obtener las actividades reales del usuario en Supabase para esa semana
        const { data: actividades, error: errActs } = await supabaseClient
            .from('actividades')
            .select('*')
            .eq('usuario', nombreUsuario)
            .gte('fecha', semanaInicio)
            .lte('fecha', semanaFin);

        if (errActs) throw new Error("Fehler beim Laden der Aktivitäten.");

        // 5. Estampar los campos fijos (Nombre, Clase, Fechas, etc.)
        if (cajas.nombre) {
            primeraPagina.drawText(nombreUsuario, {
                x: cajas.nombre.x1,
                y: primeraPagina.getHeight() - cajas.nombre.y2, // PDF-lib usa el origen abajo-izquierda, por eso restamos del alto
                size: fontSize,
                font: fuenteNormal,
                color: PDFLib.rgb(0, 0, 0),
            });
        }

        // Estampar campos adicionales (Klasse, Ausbildungsrichtung, Wochenbericht, etc.)
        // Repetiríamos el mismo bloque seguro para cada caja mapeada...

        // 6. Organizar y estampar las actividades por día de la semana (Lunes a Viernes)
        // Agrupar actividades por fecha y colocarlas dentro de las cajas de texto y de horas correspondientes...

        // 7. Generar el PDF final listo para descargar o previsualizar
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const urlPdf = URL.createObjectURL(blob);

        // Abrir el PDF generado en una nueva pestaña para imprimir
        window.open(urlPdf, '_blank');

    } catch (error) {
        console.error("Error al generar el PDF rellenado:", error);
        alert("❌ Fehler: " + error.message);
    }
}
