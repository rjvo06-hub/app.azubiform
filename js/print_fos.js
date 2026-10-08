import { SUPABASE_URL, headers } from './config.js';

export async function inicializarVistaPreviaSemanasFos(contenedorId, usuarioId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center justify-between border-b border-gray-200 pb-3">
                <h3 class="text-xs font-bold text-indigo-900 uppercase">📄 Vorschau des Ausbildungsnachweises (Wochenauswahl)</h3>
                <div class="flex items-center space-x-2 text-xs">
                    <label class="font-bold text-gray-700">Woche wählen:</label>
                    <select id="selectSemanaFos" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
                        <option value="">Lade Wochen...</option>
                    </select>
                </div>
            </div>

            <div class="bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded-r-lg text-xs">
                <p class="text-indigo-800">Wähle eine Woche aus, um die Vorschau mit den gespeicherten Koordinaten zu generieren. Fehlende Daten bleiben leer, behalten aber ihren exakten Platz.</p>
            </div>

            <div class="relative overflow-auto border border-gray-300 rounded-lg bg-gray-900 flex justify-center p-2 max-h-[700px]">
                <div class="relative inline-block" id="previewWrapper">
                    <canvas id="previewCanvas" class="block shadow-lg"></canvas>
                    <div id="previewOverlay" class="absolute inset-0 pointer-events-none"></div>
                </div>
            </div>
        </div>
    `;

    const selectSemana = contenedor.querySelector('#selectSemanaFos');
    const canvas = contenedor.querySelector('#previewCanvas');
    const overlay = contenedor.querySelector('#previewOverlay');

    let globalPlantilla = null;
    let globalRegistros = [];
    let pdfPageViewport = null;

    try {
        // 1. Obtener los datos del usuario para conocer su 'schul_name'
        const resUsuario = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?id=eq.${usuarioId}&select=*`, {
            headers: headers
        });
        const usuarios = await resUsuario.json();
        if (!usuarios || usuarios.length === 0) {
            alert("❌ Usuario no encontrado.");
            return;
        }
        const schulName = usuarios[0].schul_name;
        if (!schulName) {
            alert("❌ El usuario no tiene asignado un 'schul_name'.");
            return;
        }

        // 2. Obtener la plantilla de la escuela usando 'schul_name'
        const resTemplate = await fetch(`${SUPABASE_URL}/rest/v1/school_templates?school_name=eq.${encodeURIComponent(schulName)}&select=*`, {
            headers: headers
        });
        const templates = await resTemplate.json();
        if (!templates || templates.length === 0) {
            alert(`❌ No se encontró la plantilla para la escuela: ${schulName}`);
            return;
        }
        globalPlantilla = templates[0];

        // 3. Obtener todos los registros diarios (semanas) de este usuario
        const resRegistros = await fetch(`${SUPABASE_URL}/rest/v1/registro_diario?user_id=eq.${usuarioId}&select=*`, {
            headers: headers
        });
        globalRegistros = await resRegistros.json();

        if (!globalRegistros || globalRegistros.length === 0) {
            selectSemana.innerHTML = `<option value="">Keine Wochen gefunden</option>`;
            return;
        }

        // Poblar el selector de semanas
        selectSemana.innerHTML = '';
        globalRegistros.forEach((reg, index) => {
            const opt = document.option ? document.createElement('option') : document.createElement('option');
            opt.value = reg.id;
            // Muestra la semana o fecha del registro (ajusta la etiqueta según las columnas de tu tabla)
            opt.textContent = `Woche / ID: ${reg.semana || reg.id || (index + 1)} (${new Date(reg.created_at || Date.now()).toLocaleDateString()})`;
            selectSemana.appendChild(opt);
        });

        // Cargar PDF base con PDF.js
        const loadingTask = pdfjsLib.getDocument(globalPlantilla.pdf_filename ? `./${globalPlantilla.pdf_filename}` : './admin.pdf');
        const pdfDoc = await loadingTask.promise;
        const pagina = await pdfDoc.getPage(1);

        const scale = 1.5;
        pdfPageViewport = pagina.getViewport({ scale });
        const context = canvas.getContext('2d');
        canvas.height = pdfPageViewport.height;
        canvas.width = pdfPageViewport.width;

        await pagina.render({ canvasContext: context, viewport: pdfPageViewport }).promise;

        // Renderizar la primera semana por defecto
        renderizarVistaPreviaSemana(globalRegistros[0].id);

        // Evento al cambiar de semana en el selector
        selectSemana.addEventListener('change', (e) => {
            renderizarVistaPreviaSemana(e.target.value);
        });

    } catch (err) {
        console.error("Error al inicializar la vista previa de Foz:", err);
        alert("❌ Ocurrió un error al cargar los datos.");
    }

    function renderizarVistaPreviaSemana(registroId) {
        overlay.innerHTML = '';
        const datosSemana = globalRegistros.find(r => r.id == registroId) || {};
        const coordenadas = globalPlantilla.coordinates_json || {};

        for (const [key, box] of Object.entries(coordenadas)) {
            if (!box) continue;

            const left = box.x1 * 1.5;
            const top = pdfPageViewport.height - (box.y2 * 1.5);
            const width = (box.x2 - box.x1) * 1.5;
            const height = (box.y2 - box.y1) * 1.5;

            const elTexto = document.createElement('div');
            elTexto.className = 'absolute text-[10px] text-black font-sans overflow-hidden px-1 flex items-center bg-white/50 border border-indigo-200/40 rounded';
            elTexto.style.left = `${left}px`;
            elTexto.style.top = `${top}px`;
            elTexto.style.width = `${width}px`;
            elTexto.style.height = `${height}px`;
            
            // Si el campo existe lo muestra; si falta, queda en blanco respetando el espacio exacto
            elTexto.textContent = datosSemana[key] !== undefined && datosSemana[key] !== null ? datosSemana[key] : '';

            overlay.appendChild(elTexto);
        }
    }
}

// Exponer globalmente si es requerido por el HTML principal
window.inicializarVistaPreviaSemanasFos = inicializarVistaPreviaSemanasFos;
