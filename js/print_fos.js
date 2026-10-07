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
        
        // 🔍 VALIDACIÓN EN CONSOLA: Ver qué coordenadas exactas devolvió Supabase
        console.log("=== SUPABASE TEMPLATE COORDENADAS ===", coordenadas);

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
            <div id="wrapperCanvasFOS" class="relative inline-block shadow-2xl bg-white">
                <canvas id="pdfCanvasFOS" class="block"></canvas>
                <div id="overlayCamposFOS" class="absolute inset-0 pointer-events-none"></div>
            </div>
        `;

        modalFOS.classList.remove('hidden');

        // Cargar y pintar la página del PDF usando PDF.js con una escala limpia (ej. 1.0 o 1.5)
        const loadingTask = pdfjsLib.getDocument('./admin.pdf');
        const pdfDoc = await loadingTask.promise;
        const page = await pdfDoc.getPage(1);
        
        const canvas = document.getElementById('pdfCanvasFOS');
        const context = canvas.getContext('2d');
        const renderScale = 1.5; // Escala de renderizado para nitidez
        const viewport = page.getViewport({ scale: renderScale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Forzar un tamaño CSS exacto para que coincida proporcionalmente con el viewport
        canvas.style.width = `${viewport.width / renderScale}px`;
        canvas.style.height = `${viewport.height / renderScale}px`;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        const overlay = document.getElementById('overlayCamposFOS');
        
        // Factor de escala real entre el espacio del PDF original y los píxeles visuales del canvas en pantalla
        const scaleFactor = (viewport.width / renderScale) / 595.27; // 595.27 es el ancho estándar en puntos de un A4

        // 6. Pintar el nombre del usuario validando la estructura de coordenadas
        if (coordenadas.nombre) {
            const coordNombre = coordenadas.nombre;
            const x = (coordNombre.x1 !== undefined ? coordNombre.x1 : (coordNombre.x || 0)) * scaleFactor;
            const y = (coordNombre.y1 !== undefined ? coordNombre.y1 : (coordNombre.y || 0)) * scaleFactor;

            const divNombre = document.createElement('div');
            divNombre.className = "absolute text-black font-sans text-xs font-semibold whitespace-nowrap bg-yellow-200/50 px-1"; // Fondo translúcido para ubicarlo visualmente
            divNombre.style.left = `${x}px`;
            divNombre.style.top = `${y}px`;
            divNombre.textContent = nombreUsuario;
            overlay.appendChild(divNombre);
            console.log("Nombre pintado en:", x, y);
        } else {
            console.warn("⚠️ La clave 'nombre' no existe en coordinates_json.");
        }

        // 7. Distribuir las actividades por día usando las claves de coordenadas guardadas
        actividades.forEach((act, index) => {
            const possibleKeys = [`m${index + 1}`, `actividad_${index + 1}`, `linea_${index + 1}`, `actividad`];
            let coord = null;

            for (const key of possibleKeys) {
                if (coordenadas[key]) {
                    coord = coordenadas[key];
                    break;
                }
            }

            const divAct = document.createElement('div');
            divAct.className = "absolute text-black font-sans text-xs whitespace-nowrap overflow-hidden bg-blue-200/40 px-1"; // Fondo translúcido para validar

            if (coord) {
                const x = (coord.x1 !== undefined ? coord.x1 : (coord.x || 100)) * scaleFactor;
                const y = ((coord.y1 !== undefined ? coord.y1 : (coord.y || 150)) + (index * 16)) * scaleFactor;

                divAct.style.left = `${x}px`;
                divAct.style.top = `${y}px`;
            } else {
                // Coordenada por defecto si la clave no se encuentra en la BD
                divAct.style.left = `${120 * scaleFactor}px`;
                divAct.style.top = `${(200 + (index * 22)) * scaleFactor}px`;
            }

            divAct.textContent = act.nombre_actividad || '';
            overlay.appendChild(divAct);
        });

    } catch (err) {
        console.error("Fehler bei print_fos:", err);
        alert("❌ Fehler: " + err.message);
    }
}
