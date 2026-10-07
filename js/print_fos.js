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

        // 2. Calcular fin de semana
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
        const viewport = page.getViewport({ scale: 1.5 }); // Escala base para alta resolución

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        // 6. Superponer textos usando ESTRICTAMENTE las coordenadas guardadas en Supabase
        const overlay = document.getElementById('overlayCamposFOS');
        
        // Relación de escala entre las coordenadas del PDF original (puntos) y el tamaño renderizado del canvas
        const scaleX = canvas.clientWidth / viewport.width;
        const scaleY = canvas.clientHeight / viewport.height;

        // Estampar el nombre si la coordenada existe en coordinates_json
        if (coordenadas.nombre) {
            const divNombre = document.createElement('div');
            divNombre.className = "absolute text-black font-sans text-xs font-semibold whitespace-nowrap";
            divNombre.style.left = `${coordenadas.nombre.x1}px`;
            divNombre.style.top = `${coordenadas.nombre.y1}px`;
            divNombre.textContent = nombreUsuario;
            overlay.appendChild(divNombre);
        }

        // Estampar las actividades iterando sobre las claves guardadas en coordinates_json
        actividades.forEach((act, index) => {
            // Buscamos si la clave de la línea existe en las coordenadas de la plantilla (ej: m1, m2, actividad_1, etc.)
            const possibleKeys = [`m${index + 1}`, `actividad_${index + 1}`, `linea_${index + 1}`];
            let coord = null;

            for (const key of possibleKeys) {
                if (coordenadas[key]) {
                    coord = coordenadas[key];
                    break;
                }
            }

            // Si no encuentra una clave específica, toma la genérica de actividad si existe
            if (!coord && coordenadas.actividad) {
                coord = coordenadas.actividad;
            }

            const divAct = document.createElement('div');
            divAct.className = "absolute text-black font-sans text-xs whitespace-nowrap overflow-hidden";
            
            if (coord) {
                divAct.style.left = `${coord.x1}px`;
                divAct.style.top = `${coord.y1 + (index * 18)}px`; // Desplazamiento vertical por línea si agrupa varias
            } else {
                // Posición predeterminada de seguridad solo si la plantilla no tiene mapeada esta línea específica
                divAct.style.left = `120px`;
                divAct.style.top = `${200 + (index * 22)}px`;
            }
            
            divAct.textContent = act.nombre_actividad || '';
            overlay.appendChild(divAct);
        });

    } catch (err) {
        console.error("Fehler bei print_fos:", err);
        alert("❌ Fehler: " + err.message);
    }
}
