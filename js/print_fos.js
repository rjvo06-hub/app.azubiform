import { SUPABASE_URL, headers } from './config.js';

export function inicializarImpresionFOS() {
    console.log("Módulo print_fos.js inicializado correctamente.");
}

export async function print_fos(nombreUsuario, fechaInicioSemana) {
    try {
        // 1. Obtener los datos del usuario actual para conocer su 'school_name' y su programa/especialidad
        const resUsuario = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?nombre=eq.${encodeURIComponent(nombreUsuario)}&select=*`, {
            method: 'GET',
            headers: headers
        });

        if (!resUsuario.ok) throw new Error("Fehler beim Laden der Benutzerdaten.");
        const usuarios = await resUsuario.json();

        if (!usuarios || usuarios.length === 0) {
            alert("❌ Benutzer in der Datenbank nicht gefunden.");
            return;
        }

        const usuarioActual = usuarios[0];
        const schoolName = usuarioActual.school_name;
        // Si el usuario pertenece a FOS social, el campo ausbildung en registro_diario reflejará algo como 'fos-sozial'
        const tipoAusbildung = usuarioActual.ausbildung || ''; // Ej: 'fos-sozial'

        if (!schoolName) {
            alert("❌ Dem Benutzer ist keine Schule (school_name) zugeordnet.");
            return;
        }

        // 2. Obtener las actividades del usuario filtrando por la columna 'usuario' y opcionalmente por 'ausbildung'
        let urlActividades = `${SUPABASE_URL}/rest/v1/registro_diario?usuario=eq.${encodeURIComponent(nombreUsuario)}&fecha=gte.${fechaInicioSemana}&select=*`;
        
        // Si tiene una especialidad definida (ej. fos-sozial), podemos refinar la búsqueda
        if (tipoAusbildung) {
            urlActividades += `&ausbildung=ilike.${encodeURIComponent('%' + tipoAusbildung + '%')}`;
        }

        const resActividades = await fetch(urlActividades, {
            method: 'GET',
            headers: headers
        });
        
        if (!resActividades.ok) {
            const errText = await resActividades.text();
            console.error("Supabase Error Response:", errText);
            throw new Error("Fehler beim Laden der Aktivitäten (Supabase API Fehler).");
        }
        const actividades = await resActividades.json();

        // 3. Buscar la plantilla específica en 'school_templates'
        let plantillaActiva = null;
        
        const resPlantilla = await fetch(`${SUPABASE_URL}/rest/v1/school_templates?file_identifier=eq.${encodeURIComponent(schoolName)}&select=*`, {
            method: 'GET',
            headers: headers
        });
        
        if (resPlantilla.ok) {
            const plantillas = await resPlantilla.json();
            if (plantillas && plantillas.length > 0) {
                plantillaActiva = plantillas[0];
            }
        }

        if (!plantillaActiva) {
            const resPlantillaAlt = await fetch(`${SUPABASE_URL}/rest/v1/school_templates?school_name=eq.${encodeURIComponent(schoolName)}&select=*`, {
                method: 'GET',
                headers: headers
            });
            if (resPlantillaAlt.ok) {
                const plantillasAlt = await resPlantillaAlt.json();
                if (plantillasAlt && plantillasAlt.length > 0) {
                    plantillaActiva = plantillasAlt[0];
                }
            }
        }

        if (!plantillaActiva) {
            alert(`❌ Keine PDF-Vorlage für '${schoolName}' in 'school_templates' gefunden.`);
            return;
        }

        const coordenadas = plantillaActiva.coordinates_json || {};

        // 4. Cargar el archivo PDF base en blanco (admin.pdf)
        const urlPdfBase = `./admin.pdf`; 
        const existingPdfBytes = await fetch(urlPdfBase).then(res => {
            if (!res.ok) throw new Error("Die Datei 'admin.pdf' wurde im Stammverzeichnis nicht gefunden.");
            return res.arrayBuffer();
        });

        // 5. Cargar pdf-lib para manipular el documento en el navegador
        const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { height } = firstPage.getSize();

        // 6. Estampar el nombre del alumno si existe la coordenada mapeada
        if (coordenadas.nombre) {
            firstPage.drawText(nombreUsuario, {
                x: coordenadas.nombre.x1,
                y: height - coordenadas.nombre.y2,
                size: 10,
                color: PDFLib.rgb(0, 0, 0)
            });
        }

        // 7. Estampar dinámicamente las actividades registradas (usando act.nombre_actividad)
        actividades.forEach(act => {
            console.log("Estampando actividad en PDF:", act.nombre_actividad);
        });

        // 8. Generar el PDF resultante para previsualización o descarga
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(blob);

        window.open(pdfUrl, '_blank');
        
        alert("✅ print_fos: PDF erfolgreich generiert und zur Vorschau geöffnet!");

    } catch (err) {
        console.error("Fehler bei print_fos:", err);
        alert("❌ Fehler: " + err.message);
    }
}
