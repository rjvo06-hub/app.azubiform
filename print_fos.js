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

            <!-- Selector de archivo PDF igual que en el mapeador -->
            <div class="bg-indigo-50 p-3 rounded-xl border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div class="flex items-center space-x-2 w-full">
                    <label class="text-[11px] font-bold text-indigo-900 whitespace-nowrap">📁 Cargar PDF base:</label>
                    <input type="file" id="pdfFilePreview" accept="application/pdf" class="text-[11px] text-gray-500 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-600 file:text-white w-full">
                </div>
            </div>

            <div class="bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded-r-lg text-xs">
                <p class="text-indigo-800">Selecciona el PDF de la escuela para alinear las cajas perfectamente.</p>
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
    const fileInputPreview = contenedor.querySelector('#pdfFilePreview');
    const canvas = contenedor.querySelector('#previewCanvas');
    const overlay = contenedor.querySelector('#previewOverlay');

    let globalPlantilla = null;
    let semanasAgrupadas = {};
    let pdfPageViewport = null;
    let pdfPageHeight = 0;
    let pdfDocGlobal = null;
    let coordenadasGlobales = {};
    
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
        coordenadasGlobales = globalPlantilla.coordinates_json || {};

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

        // Evento para cargar el PDF seleccionado por el usuario (misma lógica que el mapeador)
        fileInputPreview.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const fileReader = new FileReader();
            fileReader.onload = async function() {
                const typedarray = new Uint8Array(this.result);
                const loadingTask = pdfjsLib.getDocument(typedarray);
                pdfDocGlobal = await loadingTask.promise;
                await renderizarPaginaPdf(1);
                renderizarVistaPreviaSemana(selectSemana.value || llavesSemanas[0]);
            };
            fileReader.readAsArrayBuffer(file);
        });

        selectSemana.addEventListener('change', (e) => {
            if (pdfDocGlobal) {
                renderizarVistaPreviaSemana(e.target.value);
            }
        });

    } catch (err) {
        console.error("Fehler beim Laden der Vorschau:", err);
        alert("❌ Ein Fehler ist aufgetreten.");
    }

    async function renderizarPaginaPdf(num) {
        const pagina = await pdfDocGlobal.getPage(num);
        pdfPageViewport = pagina.getViewport({ scale });
        pdfPageHeight = pdfPageViewport.height;

        const context = canvas.getContext('2d');
        canvas.height = pdfPageHeight;
        canvas.width = pdfPageViewport.width;

        await pagina.render({ canvasContext: context, viewport: pdfPageViewport }).promise;
    }

    function agruparRegistrosPorSemana(registros) {
        const semanas = {};
        registros.forEach(reg => {
            if (!reg.fecha) return;
            const fechaObj = new Date(reg.fecha);
            
            const diaSemana = fechaObj.getDay();
            const diff = fechaObj.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
            const lunes = new Date(new Date(fechaObj).setDate(diff));
            const viernes = new Date(lunes);
            viernes.setDate(lunes.getDate() + 4);

            const claveSemana = `${lunes.toLocaleDateString()} bis ${viernes.toLocaleDateString()}`;

            if (!semanas[claveSemana]) {
                semanas[claveSemana] = {
                    lunes: [],
                    dienstag: [],
                    mittwoch: [],
                    donnerstag: [],
                    freitag: []
                };
            }

            const d = new Date(reg.fecha).getDay();
            const textoActividad = reg.nombre_actividad || '';

            if (d === 1) semanas[claveSemana].lunes.push(textoActividad);
            else if (d === 2) semanas[claveSemana].dienstag.push(textoActividad);
            else if (d === 3) semanas[claveSemana].mittwoch.push(textoActividad);
            else if (d === 4) semanas[claveSemana].donnerstag.push(textoActividad);
            else if (d === 5) semanas[claveSemana].freitag.push(textoActividad);
        });
        return semanas;
    }

    function pdfToCanvasCoords(box) {
        const left = box.x1 * scale;
        const top = pdfPageHeight - (box.y1 * scale) - ((box.y2 - box.y1) * scale);
        const width = (box.x2 - box.x1) * scale;
        const height = (box.y2 - box.y1) * scale;
        return { left, top, width, height };
    }

    function renderizarVistaPreviaSemana(semKey) {
        overlay.innerHTML = '';
        const datosSemana = semanasAgrupadas[semKey] || {};

        for (const [key, box] of Object.entries(coordenadasGlobales)) {
            if (!box) continue;

            const pos = pdfToCanvasCoords(box);
            const elTexto = document.createElement('div');
            elTexto.className = 'absolute text-[9px] text-black font-sans overflow-hidden px-1 flex items-center bg-white/90 border border-indigo-300 rounded';
            elTexto.style.left = `${pos.left}px`;
            elTexto.style.top = `${pos.top}px`;
            elTexto.style.width = `${pos.width}px`;
            elTexto.style.height = `${pos.height}px`;
            
            const lowerKey = key.toLowerCase();
            let textoAsignado = '';

            if (!lowerKey.includes('stunden') && !lowerKey.includes('hora') && !lowerKey.includes('zeit')) {
                if (lowerKey.includes('montag') || lowerKey.includes('lunes')) {
                    textoAsignado = datosSemana.lunes.join(' • ');
                } else if (lowerKey.includes('dienstag') || lowerKey.includes('martes')) {
                    textoAsignado = datosSemana.dienstag.join(' • ');
                } else if (lowerKey.includes('mittwoch') || lowerKey.includes('miercoles')) {
                    textoAsignado = datosSemana.mittwoch.join(' • ');
                } else if (lowerKey.includes('donnerstag') || lowerKey.includes('jueves')) {
                    textoAsignado = datosSemana.donnerstag.join(' • ');
                } else if (lowerKey.includes('freitag') || lowerKey.includes('viernes')) {
                    textoAsignado = datosSemana.freitag.join(' • ');
                }
            }

            elTexto.textContent = textoAsignado;
            overlay.appendChild(elTexto);
        }
    }
}
