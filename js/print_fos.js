import { SUPABASE_URL, headers } from './config.js';

let fechaActualFOS = null;
let usuarioActualFOS = null;

export function inicializarImpresionFOS() {
    console.log("Módulo print_fos.js inicializado correctamente.");
    
    window.cerrarModalFOS = function() {
        const modal = document.getElementById('modalImpresionFOS');
        if (modal) modal.classList.add('hidden');
    };

    window.cambiarSemanaFOS = function(deltaSemanas) {
        if (!fechaActualFOS || !usuarioActualFOS) return;
        
        let fecha = new Date(fechaActualFOS);
        fecha.setDate(fecha.getDate() + (deltaSemanas * 7));
        fechaActualFOS = fecha.toISOString().split('T')[0];
        
        print_fos(usuarioActualFOS, fechaActualFOS);
    };
}

export async function print_fos(nombreUsuario, fechaInicioSemana) {
    try {
        usuarioActualFOS = nombreUsuario;
        
        if (!fechaInicioSemana) {
            const hoy = new Date();
            const dia = hoy.getDay();
            const diff = hoy.getDate() - dia + (dia === 0 ? -6 : 1);
            const lunes = new Date(hoy.setDate(diff));
            fechaInicioSemana = lunes.toISOString().split('T')[0];
        }
        fechaActualFOS = fechaInicioSemana;

        // 1. Obtener datos del usuario
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

        // 2. Calcular fin de semana (Domingo)
        let dLunes = new Date(fechaInicioSemana);
        let dDomingo = new Date(dLunes);
        dDomingo.setDate(dDomingo.getDate() + 6);
        const fechaFinSemana = dDomingo.toISOString().split('T')[0];

        // 3. Obtener actividades de la semana
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

        // 4. Buscar plantilla y coordenadas en 'school_templates'
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

        const coordenadas = plantillaActiva ? (plantillaActiva.coordinates_json || {}) : {};

        // 5. Configurar vista previa en el modal
        const previewContainer = document.getElementById('fosPreviewContainer');
        const modalFOS = document.getElementById('modalImpresionFOS');
        const lblInfo = document.getElementById('lblFosInfoUsuario');

        if (!previewContainer || !modalFOS) {
            alert("❌ Vorschau-Container nicht im HTML gefunden.");
            return;
        }

        if (lblInfo) {
            lblInfo.textContent = `Woche: ${fechaInicioSemana} bis ${fechaFinSemana} (${actividades.length} Einträge)`;
        }

        previewContainer.innerHTML = `
            <div class="relative inline-block shadow-2xl bg-white">
                <canvas id="pdfCanvasFOS" class="block"></canvas>
                <div id="overlayCamposFOS" class="absolute inset-0 pointer-events-none"></div>
            </div>
        `;

        modalFOS.classList.remove('hidden');

        // Cargar y pintar la página del PDF usando PDF.js
        const loadingTask = pdfjsLib.getDocument('./admin.pdf');
        const pdfDoc = await loadingTask.promise;
        const page = await pdfDoc.getPage(1);
        
        const canvas = document.getElementById('pdfCanvasFOS');
        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: 1.5 });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        const overlay = document.getElementById('overlayCamposFOS');

        // 6. Estampar el nombre del usuario
        if (coordenadas.nombre) {
            const divNombre = document.createElement('div');
            divNombre.className = "absolute text-black font-sans text-xs font-semibold whitespace-nowrap";
            divNombre.style.left = `${coordenadas.nombre.x1}px`;
            divNombre.style.top = `${coordenadas.nombre.y1}px`;
            divNombre.textContent = nombreUsuario;
            overlay.appendChild(divNombre);
        }

        // 7. Distribuir las actividades por día de la semana basándonos en las coordenadas mapeadas
        // Agrupamos las actividades por fecha (YYYY-MM-DD)
        const actividadesPorDia = {};
        actividades.forEach(act => {
            const fechaKey = act.fecha; // Ej: '2026-09-28'
            if (!actividadesPorDia[fechaKey]) {
                actividadesPorDia[fechaKey] = [];
            }
            actividadesPorDia[fechaKey].push(act);
        });

        // Recorremos los días de la semana (Lunes a Viernes) a partir del lunes de la semana actual
        for (let i = 0; i < 5; i++) {
            let dDia = new Date(dLunes);
            dDia.setDate(dDia.getDate() + i);
            const fechaStr = dDia.toISOString().split('T')[0];
            
            const actsDelDia = actividadesPorDia[fechaStr] || [];
            
            // Determinamos la coordenada base para este día (ej: m1..m6 para lunes, di1..di6 para martes, etc.)
            // O usamos las claves estándar almacenadas en la base de datos
            const prefijoDia = ['m', 'di', 'mi', 'do', 'fr'][i]; // m = Montag, di = Dienstag, etc.

            actsDelDia.forEach((act, lineIndex) => {
                const coordKey = `${prefijoDia}${lineIndex + 1}`; // Ej: m1, m2, di1...
                let coord = coordenadas[coordKey] || null;

                // Si no hay clave específica para esa línea, buscamos una coordenada genérica o calculamos un offset
                const divAct = document.createElement('div');
                divAct.className = "absolute text-black font-sans text-xs whitespace-nowrap overflow-hidden";

                if (coord) {
                    divAct.style.left = `${coord.x1}px`;
                    divAct.style.top = `${coord.y1}px`;
                } else if (coordenadas.actividad) {
                    divAct.style.left = `${coordenadas.actividad.x1}px`;
                    divAct.style.top = `${coordenadas.actividad.y1 + (i * 80) + (lineIndex * 18)}px`;
                } else {
                    // Respaldo visual si no hay mapeo específico
                    divAct.style.left = `130px`;
                    divAct.style.top = `${220 + (i * 65) + (lineIndex * 18)}px`;
                }

                divAct.textContent = act.nombre_actividad || '';
                overlay.appendChild(divAct);
            });
        }

    } catch (err) {
        console.error("Fehler bei print_fos:", err);
        alert("❌ Fehler: " + err.message);
    }
}
