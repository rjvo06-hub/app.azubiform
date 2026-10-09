import { SUPABASE_URL, headers } from './js/config.js';

export async function inicializarPruebaVistaPreviaFos(contenedorId, usuarioId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    const idPrueba = 93;

    contenedor.innerHTML = `
        <div class="space-y-4 p-4 bg-gray-50 rounded-xl shadow-sm">
            <div class="flex items-center justify-between border-b border-gray-200 pb-3">
                <h3 class="text-xs font-bold text-indigo-900 uppercase">📄 Vista Previa FOS (Katharina Schwarz)</h3>
                <div class="flex items-center space-x-2 text-xs">
                    <label class="font-bold text-gray-700">Woche wählen:</label>
                    <select id="selectSemanaFos" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
                        <option value="">Lade Wochen...</option>
                    </select>
                </div>
            </div>

            <div class="bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded-r-lg text-xs">
                <p class="text-indigo-800">Mapeando actividades en las descripciones diarias y separando campos del PDF.</p>
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
    let semanasAgrupadas = {};
    let pdfPageViewport = null;
    let pdfPageHeight = 0;
    
    // Escala idéntica a la del mapeador (1.2)
    const scale = 1.2; 

    try {
        const resUsuario = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?id=eq.${idPrueba}&select=*`, {
            headers: headers
        });
        const usuarios = await resUsuario.json();
        if (!usuarios || usuarios.length === 0) {
            alert(`❌ Usuario con ID ${idPrueba} nicht gefunden.`);
            return;
        }
        const usuarioData = usuarios[0];
        const schoolName = usuarioData.school_name;
        const nombreUsuario = usuarioData.nombre;

        if (!schoolName) {
            alert("❌ Der Benutzer hat keinen 'school_name' zugewiesen.");
            return;
        }

        const resTemplate = await fetch(`${SUPABASE_URL}/rest/v1/school_templates?school_name=eq.${encodeURIComponent(schoolName)}&select=*`, {
            headers: headers
        });
        const templates = await resTemplate.json();
        if (!templates || templates.length === 0) {
            alert(`❌ Keine Vorlage für die Schule gefunden: ${schoolName}`);
            return;
        }
        globalPlantilla = templates[0];
        const coordenadas = globalPlantilla.coordinates_json || {};

        const resRegistros = await fetch(`${SUPABASE_URL}/rest/v1/registro_diario?usuario=eq.${encodeURIComponent(nombreUsuario)}&select=*`, {
            headers: headers
        });
        let registrosRaw = await resRegistros.json();

        if (!Array.isArray(registrosRaw) || registrosRaw.length === 0) {
            selectSemana.innerHTML = `<option value="">Keine Wochen gefunden</option>`;
            return;
        }

        semanasAgrupadas = agruparRegistrosPorSemana(registrosRaw);

        const llavesSemanas = Object.keys(semanasAgrupadas);
        if (llavesSemanas.length === 0) {
            selectSemana.innerHTML = `<option value="">Keine Wochen gefunden</option>`;
            return;
        }

        selectSemana.innerHTML = '';
        llavesSemanas.forEach((semKey) => {
            const opt = document.createElement('option');
            opt.value = semKey;
            opt.textContent = `Woche: ${semKey}`;
            selectSemana.appendChild(opt);
        });

        const loadingTask = pdfjsLib.getDocument('./admin.pdf');
        const pdfDoc = await loadingTask.promise;
        const pagina = await pdfDoc.getPage(1);

        pdfPageViewport = pagina.getViewport({ scale });
        pdfPageHeight = pdfPageViewport.height;

        const context = canvas.getContext('2d');
        canvas.height = pdfPageHeight;
        canvas.width = pdfPageViewport.width;

        await pagina.render({ canvasContext: context, viewport: pdfPageViewport }).promise;

        renderizarVistaPreviaSemana(llavesSemanas[0], coordenadas);

        selectSemana.addEventListener('change', (e) => {
            renderizarVistaPreviaSemana(e.target.value, coordenadas);
        });

    } catch (err) {
        console.error("Fehler beim Laden der Vorschau:",
