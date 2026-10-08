import { SUPABASE_URL, headers } from './config.js';

export async function inicializarVistaPreviaSemanasFos(contenedorId, usuarioId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center justify-between border-b border-gray-200 pb-3">
                <h3 class="text-xs font-bold text-indigo-900 uppercase">📄 Vorschau mit intelligenten Koordinaten</h3>
                <div class="flex items-center space-x-2 text-xs">
                    <label class="font-bold text-gray-700">Woche wählen:</label>
                    <select id="selectSemanaFos" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
                        <option value="">Lade Wochen...</option>
                    </select>
                </div>
            </div>

            <div class="bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded-r-lg text-xs">
                <p class="text-indigo-800">Die Vorschau nutzt die exakten X/Y-Koordinaten aus dem PDF-Extractor. Fehlende Daten bleiben leer unter Beibehaltung der Layout-Boxen.</p>
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
    let pdfPageHeight = 0;

    try {
        // 1. Obtener los datos del usuario para conocer su 'school_name'
        const resUsuario = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?id=eq.${usuarioId}&select=*`, {
            headers: headers
        });
        const usuarios = await resUsuario.json();
        if (!usuarios || usuarios.length === 0) {
            alert("❌ Usuario no encontrado.");
            return;
        }
        const schoolName = usuarios[0].school_name;
        if (!schoolName) {
            alert("❌ El usuario no tiene asignado un 'school_name'.");
            return;
        }

        // 2. Obtener la plantilla y sus coordenadas guardadas en 'school_templates'
        const resTemplate = await fetch(`${SUPABASE_URL}/rest/v1/school_templates?school_name=eq.${encodeURIComponent(schoolName)}&select=*`, {
            headers: headers
        });
        const templates = await resTemplate.json();
        if (!templates || templates.length === 0) {
            alert(`❌ No se encontró la plantilla de coordenadas para la escuela: ${schoolName}`);
            return;
        }
        globalPlantilla = templates[0];
        const coordenadas = globalPlantilla.coordinates_json || {};

        // 3. Obtener los registros de actividad del usuario
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
            const opt = document.createElement('option');
            opt.value = reg.id;
            opt.textContent = `Woche / ID: ${reg.semana || reg.id || (index + 1)} (${new Date(reg.created_at || Date.now()).toLocaleDateString()})`;
            selectSemana.appendChild(opt);
        });

        // 4. Renderizar el PDF base con PDF.js a escala 1.5 (igual que en el extractor)
        const loadingTask = pdfjsLib.getDocument(globalPlantilla.pdf_filename ? `./${globalPlantilla.pdf_filename}` : './admin.pdf');
        const pdfDoc = await loadingTask.promise;
        const pagina = await pdfDoc.getPage(1);

        const scale = 1.5;
        pdfPageViewport = pagina.getViewport({ scale });
        pdfPageHeight = pdfPageViewport.height;

        const context = canvas.getContext('2d');
        canvas.height = pdfPageHeight;
        canvas.width = pdfPageViewport.width;

        await pagina.render({ canvasContext: context, viewport: pdfPageViewport }).promise;

        // Renderizar la primera semana por defecto
        renderizarVistaPreviaSemana(globalRegistros[0].id, coordenadas);

        // Evento al cambiar de semana
        selectSemana.addEventListener('change', (e) => {
            renderizarVistaPreviaSemana(e.target.value, coordenadas);
        });

    } catch (err) {
        console.error("Error al inicializar la vista previa con coordenadas:", err);
        alert("❌ Ocurrió un error al cargar la vista previa.");
    }

    function pdfToCanvasCoords(box) {
        const scale = 1.5;
        const left = box.x1 * scale;
        // Invertir eje Y de PDF a Canvas
        const canvasTop = pdfPageHeight - (box.y2 * scale);
        const width = (box.x2 - box.x1) * scale;
        const height = (box.y2 - box.y1) * scale;
        return { left, top: canvasTop, width, height };
    }

    function renderizarVistaPreviaSemana(registroId, coordenadas) {
        overlay.innerHTML = '';
        const datosSemana = globalRegistros.find(r => r.id == registroId) || {};

        for (const [key, box] of Object.entries(coordenadas)) {
            if (!box) continue;

            const pos = pdfToCanvasCoords(box);

            const elTexto = document.createElement('div');
            elTexto.className = 'absolute text-[10px] text-black font-sans overflow-hidden px-1 flex items-center bg-white/60 border border-indigo-300/60 rounded';
            elTexto.style.left = `${pos.left}px`;
            elTexto.style.top = `${pos.top}px`;
            elTexto.style.width = `${pos.width}px`;
            elTexto.style.height = `${pos.height}px`;
            
            // Asignar el texto correspondiente de la semana o dejar en blanco manteniendo el espacio exacto
            elTexto.textContent = datosSemana[key] !== undefined && datosSemana[key] !== null ? datosSemana[key] : '';

            overlay.appendChild(elTexto);
        }
    }
}

window.inicializarVistaPreviaSemanasFos = inicializarVistaPreviaSemanasFos;
