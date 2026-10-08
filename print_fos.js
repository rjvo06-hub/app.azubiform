import { SUPABASE_URL, headers } from './js/config.js';

export async function inicializarPruebaVistaPreviaFos(contenedorId, usuarioId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    const idPrueba = 93;

    contenedor.innerHTML = `
        <div class="space-y-4 p-4 bg-gray-50 rounded-xl shadow-sm">
            <div class="flex items-center justify-between border-b border-gray-200 pb-3">
                <h3 class="text-xs font-bold text-indigo-900 uppercase">📄 Modo de Prueba: Vista Previa con Coordenadas FOS (Usuario ID: ${idPrueba})</h3>
                <div class="flex items-center space-x-2 text-xs">
                    <label class="font-bold text-gray-700">Woche wählen:</label>
                    <select id="selectSemanaFos" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
                        <option value="">Lade Wochen...</option>
                    </select>
                </div>
            </div>

            <div class="bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded-r-lg text-xs">
                <p class="text-indigo-800">Entorno aislado mapeando las coordenadas X/Y del PDF vía PDF.js.</p>
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
        // 1. Obtener datos del usuario
        const resUsuario = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?id=eq.${idPrueba}&select=*`, {
            headers: headers
        });
        const usuarios = await resUsuario.json();
        if (!usuarios || usuarios.length === 0) {
            alert(`❌ Usuario con ID ${idPrueba} no encontrado.`);
            return;
        }
        const usuarioData = usuarios[0];
        const schoolName = usuarioData.school_name;
        const nombreUsuario = usuarioData.nombre || usuarioData.email || String(idPrueba);

        if (!schoolName) {
            alert("❌ El usuario no tiene un 'school_name' asignado.");
            return;
        }

        // 2. Obtener plantilla de coordenadas
        const resTemplate = await fetch(`${SUPABASE_URL}/rest/v1/school_templates?school_name=eq.${encodeURIComponent(schoolName)}&select=*`, {
            headers: headers
        });
        const templates = await resTemplate.json();
        if (!templates || templates.length === 0) {
            alert(`❌ No se encontró la plantilla para la escuela: ${schoolName}`);
            return;
        }
        globalPlantilla = templates[0];
        const coordenadas = globalPlantilla.coordinates_json || {};

        // 3. Obtener registros diarios
        let resRegistros = await fetch(`${SUPABASE_URL}/rest/v1/registro_diario?usuario=eq.${idPrueba}&select=*`, {
            headers: headers
        });
        globalRegistros = await resRegistros.json();

        if (!Array.isArray(globalRegistros) || globalRegistros.length === 0) {
            resRegistros = await fetch(`${SUPABASE_URL}/rest/v1/registro_diario?usuario=eq.${encodeURIComponent(nombreUsuario)}&select=*`, {
                headers: headers
            });
            globalRegistros = await resRegistros.json();
        }

        if (!Array.isArray(globalRegistros) || globalRegistros.length === 0) {
            selectSemana.innerHTML = `<option value="">Keine Wochen gefunden</option>`;
            return;
        }

        selectSemana.innerHTML = '';
        globalRegistros.forEach((reg, index) => {
            const opt = document.createElement('option');
            opt.value = reg.id;
            opt.textContent = `Woche / ID: ${reg.semana || reg.id || (index + 1)} (${new Date(reg.created_at || Date.now()).toLocaleDateString()})`;
            selectSemana.appendChild(opt);
        });

        // 4. Renderizar PDF base apuntando de forma segura a 'admin.pdf'
        const loadingTask = pdfjsLib.getDocument('./admin.pdf');
        const pdfDoc = await loadingTask.promise;
        const pagina = await pdfDoc.getPage(1);

        const scale = 1.5;
        pdfPageViewport = pagina.getViewport({ scale });
        pdfPageHeight = pdfPageViewport.height;

        const context = canvas.getContext('2d');
        canvas.height = pdfPageHeight;
        canvas.width = pdfPageViewport.width;

        await pagina.render({ canvasContext: context, viewport: pdfPageViewport }).promise;

        renderizarVistaPreviaSemana(globalRegistros[0].id, coordenadas);

        selectSemana.addEventListener('change', (e) => {
            renderizarVistaPreviaSemana(e.target.value, coordenadas);
        });

    } catch (err) {
        console.error("Error al inicializar la vista previa:", err);
        alert("❌ Ocurrió un error al cargar la vista previa.");
    }

    function pdfToCanvasCoords(box) {
        const scale = 1.5;
        const left = box.x1 * scale;
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
            
            elTexto.textContent = datosSemana[key] !== undefined && datosSemana[key] !== null ? datosSemana[key] : '';

            overlay.appendChild(elTexto);
        }
    }
}
