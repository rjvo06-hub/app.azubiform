import { SUPABASE_URL, headers } from './config.js';

// Variable global para llevar el control de la fecha que se está visualizando
let fechaActualFOS = null;
let usuarioActualFOS = null;

export function inicializarImpresionFOS() {
    console.log("Módulo print_fos.js inicializado correctamente.");
    
    window.cerrarModalFOS = function() {
        const modal = document.getElementById('modalImpresionFOS');
        if (modal) modal.classList.add('hidden');
    };

    // Función para cambiar de semana desde los botones de la vista previa
    window.cambiarSemanaFOS = function(deltaSemanas) {
        if (!fechaActualFOS || !usuarioActualFOS) return;
        
        let fecha = new Date(fechaActualFOS);
        fecha.setDate(fecha.getDate() + (deltaSemanas * 7));
        fechaActualFOS = fecha.toISOString().split('T')[0];
        
        // Recargar la vista con la nueva semana
        print_fos(usuarioActualFOS, fechaActualFOS);
    };
}

export async function print_fos(nombreUsuario, fechaInicioSemana) {
    try {
        usuarioActualFOS = nombreUsuario;
        
        // Si no se pasa una fecha de inicio, calculamos el lunes de la semana actual
        if (!fechaInicioSemana) {
            const hoy = new Date();
            const dia = hoy.getDay();
            const diff = hoy.getDate() - dia + (dia === 0 ? -6 : 1);
            const lunes = new Date(hoy.setDate(diff));
            fechaInicioSemana = lunes.toISOString().split('T')[0];
        }
        fechaActualFOS = fechaInicioSemana;

        // 1. Obtener los datos del usuario actual
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

        // 2. Calcular la fecha de fin de semana (6 días después del lunes)
        let dLunes = new Date(fechaInicioSemana);
        let dDomingo = new Date(dLunes);
        dDomingo.setDate(dDomingo.getDate() + 6);
        const fechaFinSemana = dDomingo.toISOString().split('T')[0];

        // 3. Obtener las actividades del usuario filtrando por el rango de la semana seleccionada
        let urlActividades = `${SUPABASE_URL}/rest/v1/registro_diario?usuario=eq.${encodeURIComponent(nombreUsuario)}&fecha=gte.${fechaInicioSemana}&fecha=lte.${fechaFinSemana}&select=*`;
        
        if (tipoAusbildung) {
            urlActividades += `&ausbildung=ilike.${encodeURIComponent('%' + tipoAusbildung + '%')}`;
        }

        const resActividades = await fetch(urlActividades, {
            method: 'GET',
            headers: headers
        });
        
        if (!resActividades.ok) throw new Error("Fehler beim Laden der Aktivitäten.");
        const actividades = await resActividades.json();

        // 4. Buscar la plantilla o coordenadas en 'school_templates'
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

        // 5. Construir la vista preliminar visual en el modal con botones de navegación
        const previewContainer = document.getElementById('fosPreviewContainer');
        const modalFOS = document.getElementById('modalImpresionFOS');
        const lblInfo = document.getElementById('lblFosInfoUsuario');

        if (!previewContainer || !modalFOS) {
            alert("❌ Vorschau-Container nicht im HTML gefunden.");
            return;
        }

        if (lblInfo) {
            lblInfo.textContent = `Woche: ${fechaInicioSemana} bis ${fechaFinSemana}`;
        }

        let htmlContenido = `
            <div class="border-b pb-4 mb-4 flex justify-between items-center">
                <div>
                    <h3 class="text-lg font-bold text-gray-800">FOS Berichtsheft - Vorschau</h3>
                    <p class="text-xs text-gray-500">Schule: <strong>${schoolName}</strong> | Schüler: <strong>${nombreUsuario}</strong></p>
                </div>
                <div class="text-right">
                    <span class="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full">${actividades.length} Einträge</span>
                </div>
            </div>
            <div class="space-y-3">
        `;

        if (actividades.length === 0) {
            htmlContenido += `<p class="text-xs text-gray-400 italic py-4 text-center">Keine Aktivitäten für diese Woche (${fechaInicioSemana} - ${fechaFinSemana}) gefunden.</p>`;
        } else {
            htmlContenido += `<ul class="space-y-2 text-xs">`;
            actividades.forEach((act) => {
                htmlContenido += `
                    <li class="bg-gray-50 p-2.5 rounded border border-gray-200 flex justify-between items-center">
                        <div>
                            <span class="font-bold text-indigo-600 mr-2">[${act.fecha}]</span>
                            <span>${act.nombre_actividad || 'Keine Beschreibung'}</span>
                        </div>
                        <span class="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded">${act.hora || 'Zeit n.v.'}</span>
                    </li>
                `;
            });
            htmlContenido += `</ul>`;
        }

        htmlContenido += `</div>`;
        previewContainer.innerHTML = htmlContenido;

        // Mostrar el modal
        modalFOS.classList.remove('hidden');

    } catch (err) {
        console.error("Fehler bei print_fos:", err);
        alert("❌ Fehler: " + err.message);
    }
}
