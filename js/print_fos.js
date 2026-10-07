import { SUPABASE_URL, headers } from './config.js';

export function inicializarImpresionFOS() {
    console.log("Módulo print_fos.js inicializado correctamente.");
}

export async function print_fos(nombreUsuario, fechaInicioSemana) {
    try {
        // 1. Obtener los datos del usuario actual (escuela y especialidad)
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
        const tipoAusbildung = usuarioActual.ausbildung || '';

        if (!schoolName) {
            alert("❌ Dem Benutzer ist keine Schule (school_name) zugeordnet.");
            return;
        }

        // 2. Obtener las actividades del usuario filtrando por la columna 'usuario' y fecha
        let urlActividades = `${SUPABASE_URL}/rest/v1/registro_diario?usuario=eq.${encodeURIComponent(nombreUsuario)}&fecha=gte.${fechaInicioSemana}&select=*`;
        
        if (tipoAusbildung) {
            urlActividades += `&ausbildung=ilike.${encodeURIComponent('%' + tipoAusbildung + '%')}`;
        }

        const resActividades = await fetch(urlActividades, {
            method: 'GET',
            headers: headers
        });
        
        if (!resActividades.ok) throw new Error("Fehler beim Laden der Aktivitäten.");
        const actividades = await resActividades.json();

        // 3. Buscar la plantilla o coordenadas específicas en 'school_templates'
        let plantillaActiva = null;
        const resPlantilla = await fetch(`${SUPABASE_URL}/rest/v1/school_templates?file_identifier=eq.${encodeURIComponent(schoolName)}&select=*`, {
            method: 'GET',
            headers: headers
        });
        
        if (resPlantilla.ok) {
            const plantillas = await resPlantilla.json();
            if (plantillas && plantillas.length > 0) plantillaActiva = plantillas[0];
        }

        if (!plantillaActiva) {
            const resPlantillaAlt = await fetch(`${SUPABASE_URL}/rest/v1/school_templates?school_name=eq.${encodeURIComponent(schoolName)}&select=*`, {
                method: 'GET',
                headers: headers
            });
            if (resPlantillaAlt.ok) {
                const plantillasAlt = await resPlantillaAlt.json();
                if (plantillasAlt && plantillasAlt.length > 0) plantillaActiva = plantillasAlt[0];
            }
        }

        // 4. Pintar los datos en una vista preliminar (puedes inyectarlos en un contenedor modal dedicado)
        console.log("Generando vista preliminar para:", nombreUsuario);
        console.log("Actividades encontradas:", actividades);

        // Aquí abrimos o rellenamos los campos visuales de la vista preliminar
        // (Por ejemplo, si creas un modal de vista previa en el HTML similar al de Ausbildung)
        
        alert(`✅ Vorschau erfolgreich geladen für ${nombreUsuario} (${actividades.length} Aktivitäten gefunden).`);

    } catch (err) {
        console.error("Fehler bei print_fos:", err);
        alert("❌ Fehler: " + err.message);
    }
}
