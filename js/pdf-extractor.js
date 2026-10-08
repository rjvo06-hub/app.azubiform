import { SUPABASE_URL, headers } from './config.js';

export function inicializarLectorYAnalizadorPdf(contenedorId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="space-y-4">
            <div class="flex border-b border-gray-200 space-x-4">
                <button type="button" id="tabEditorPdf" class="pb-2 px-4 text-xs font-bold text-indigo-600 border-b-2 border-indigo-600 focus:outline-none">🤖 Editor & Drag-and-Drop</button>
                <button type="button" id="tabConsultaPdf" class="pb-2 px-4 text-xs font-semibold text-gray-400 border-b-2 border-transparent hover:text-gray-600 focus:outline-none">🔍 Gespeicherte Vorlagen</button>
            </div>

            <!-- SECCIÓN 1: EDITOR -->
            <div id="seccionEditorPdf" class="space-y-4">
                <div class="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg">
                    <h3 class="text-xs font-bold text-indigo-900 uppercase mb-1">Präzises Feld-Mapping</h3>
                    <p class="text-xs text-indigo-800">Lade ein PDF hoch, um die Felder per Drag & Drop oder manuell zu positionieren.</p>
                </div>

                <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                    <div>
                        <label class="block text-[10px] font-bold text-gray-700 uppercase mb-1">1. Name der Schule (school_name)</label>
                        <input type="text" id="inputSchoolName" value="Berufliche Oberschule Holzkirchen" class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-700 uppercase mb-1">2. Eindeutiger Bezeichner (file_identifier)</label>
                        <input type="text" id="inputFileIdentifier" value="holzkirchen_admin" class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-700 uppercase mb-1">3. PDF-Vorlage hochladen</label>
                        <input type="file" id="inputArchivoAuto" accept="application/pdf" class="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 cursor-pointer">
                    </div>
                </div>

                <div id="resultadoAnalisisAuto" class="hidden bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4 text-xs">
                    <div class="flex items-center space-x-2 text-emerald-600 font-bold">
                        <span>✅</span> <span>PDF analysiert! Passe die Positionen an:</span>
                    </div>
                    
                    <div class="flex flex-col lg:flex-row gap-4">
                        <div class="relative overflow-auto border border-gray-300 rounded-lg bg-gray-100 p-2 flex justify-center items-start flex-1 max-h-[600px]">
                            <div id="canvasWrapperPreview" class="relative inline-block shadow-md bg-white select-none">
                                <canvas id="pdfPreviewCanvas" class="block"></canvas>
                                <div id="pdfPreviewOverlay" class="absolute inset-0"></div>
                            </div>
                        </div>
                        <div class="w-full lg:w-80 bg-gray-50 border border-gray-200 p-3 rounded-lg flex flex-col max-h-[600px] overflow-y-auto">
                            <h4 class="font-bold text-gray-700 uppercase text-[11px] mb-2 border-b pb-1">Felder</h4>
                            <div id="panelElementosLista" class="space-y-2 flex-1"></div>
                        </div>
                    </div>

                    <div id="logCoordenadasDetectadas" class="bg-gray-50 p-3 rounded-lg font-mono text-[10px] text-gray-600 max-h-32 overflow-y-auto border border-gray-200"></div>
                    <button type="button" id="btnGuardarAutoSupabase" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow transition">💾 In Supabase speichern</button>
                </div>
            </div>

            <!-- SECCIÓN 2: CONSULTA -->
            <div id="seccionConsultaPdf" class="space-y-4 hidden">
                <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                    <div class="flex justify-between items-center">
                        <h3 class="text-xs font-bold text-gray-800 uppercase">Gespeicherte Vorlagen</h3>
                        <button type="button" id="btnRecargarPlantillas" class="bg-indigo-50 text-indigo-600 font-semibold text-xs px-3 py-1.5 rounded-lg">🔄 Aktualisieren</button>
                    </div>
                    <div id="listaPlantillasGuardadas" class="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                        <p class="text-xs text-gray-400 text-center py-8">Lade gespeicherte Vorlagen...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    const tabEditor = contenedor.querySelector('#tabEditorPdf');
    const tabConsulta = contenedor.querySelector('#tabConsultaPdf');
    const secEditor = contenedor.querySelector('#seccionEditorPdf');
    const secConsulta = contenedor.querySelector('#seccionConsultaPdf');

    tabEditor.addEventListener('click', () => {
        secEditor.classList.remove('hidden');
        secConsulta.classList.add('hidden');
        tabEditor.className = "pb-2 px-4 text-xs font-bold text-indigo-600 border-b-2 border-indigo-600 focus:outline-none";
        tabConsulta.className = "pb-2 px-4 text-xs font-semibold text-gray-400 border-b-2 border-transparent hover:text-gray-600 focus:outline-none";
    });

    tabConsulta.addEventListener('click', () => {
        secEditor.classList.add('hidden');
        secConsulta.classList.remove('hidden');
        tabConsulta.className = "pb-2 px-4 text-xs font-bold text-indigo-600 border-b-2 border-indigo-600 focus:outline-none";
        tabEditor.className = "pb-2 px-4 text-xs font-semibold text-gray-400 border-b-2 border-transparent hover:text-gray-600 focus:outline-none";
        cargarPlantillasGuardadas();
    });

    let coordenadasDetectadas = {
        nombre: { x1: 150, y1: 750, x2: 300, y2: 765 },
        wochenbericht_nr: { x1: 150, y1: 715, x2: 200, y2: 730 },
        semana_inicio: { x1: 220, y1: 715, x2: 280, y2: 730 },
        semana_fin: { x1: 300, y1: 715, x2: 360, y2: 730 },
        klasse: { x1: 100, y1: 670, x2: 200, y2: 685 }
    };
    let nombreArchivoOriginal = 'admin.pdf';
    let renderScale = 1.25;

    async function cargarPlantillasGuardadas() {
        const listaDiv = contenedor.querySelector('#listaPlantillasGuardadas');
        listaDiv.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">Wird geladen...</p>`;
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/school_templates?select=*`, { method: 'GET', headers: headers });
            if (!response.ok) throw new Error();
            const plantillas = await response.json();
            if (!plantillas || plantillas.length === 0) {
                listaDiv.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">Keine Vorlagen gefunden.</p>`;
                return;
            }
            let html = '';
            plantillas.forEach((tpl) => {
                html += `
                    <div class="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center text-xs">
                        <div>
                            <span class="font-bold text-gray-800">${tpl.school_name || 'Unbekannt'}</span>
                            <span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded ml-2">${tpl.file_identifier || 'N/A'}</span>
                        </div>
                    </div>
                `;
            });
            listaDiv.innerHTML = html;
        } catch (err) {
            listaDiv.innerHTML = `<p class="text-xs text-red-500 text-center py-4">Fehler beim Laden.</p>`;
        }
    }

    contenedor.querySelector('#btnRecargarPlantillas').addEventListener('click', cargarPlantillasGuardadas);

    const inputArchivo = contenedor.querySelector('#inputArchivoAuto');
    const divResultado = contenedor.querySelector('#resultadoAnalisisAuto');
    const logCoordenadas = contenedor.querySelector('#logCoordenadasDetectadas');
    const btnGuardar = contenedor.querySelector('#btnGuardarAutoSupabase');
    const canvas = contenedor.querySelector('#pdfPreviewCanvas');
    const overlay = contenedor.querySelector('#pdfPreviewOverlay');
    const panelLista = contenedor.querySelector('#panelElementosLista');

    inputArchivo.addEventListener('change', async (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;
        nombreArchivoOriginal = archivo.name;
        const lector = new FileReader();
        lector.onload = async function() {
            try {
                const pdfDoc = await pdfjsLib.getDocument(new Uint8Array(this.result)).promise;
                const pagina = await pdfDoc.getPage(1);
                const viewport = pagina.getViewport({ scale: renderScale });
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                canvas.style.width = `${viewport.width / renderScale}px`;
                canvas.style.height = `${viewport.height / renderScale}px`;
                await pagina.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
                renderizarEditorVisual(viewport);
                divResultado.classList.remove('hidden');
            } catch (err) {
                alert("❌ Fehler beim Laden des PDFs.");
            }
        };
        lector.readAsArrayBuffer(archivo);
    });

    function renderizarEditorVisual(viewport) {
        overlay.innerHTML = '';
        panelLista.innerHTML = '';
        const scaleFactor = (viewport.width / renderScale) / 595.27;

        Object.keys(coordenadasDetectadas).forEach(key => {
            const c = coordenadasDetectadas[key];
            if (!c) return;

            const div = document.createElement('div');
            div.className = "absolute cursor-move bg-amber-100/90 border border-amber-400 text-black font-sans text-[10px] font-medium px-1.5 py-0.5 rounded shadow-sm select-none";
            div.style.left = `${c.x1 * scaleFactor}px`;
            div.style.top = `${(842 - c.y2) * scaleFactor}px`;
            div.textContent = key;
            overlay.appendChild(div);
        });
        logCoordenadas.textContent = JSON.stringify(coordenadasDetectadas, null, 2);
    }

    btnGuardar.addEventListener('click', async () => {
        const schoolName = contenedor.querySelector('#inputSchoolName').value.trim();
        const fileIdentifier = contenedor.querySelector('#inputFileIdentifier').value.trim();
        if (!schoolName || !fileIdentifier) {
            alert("Bitte fülle die Felder aus.");
            return;
        }
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/school_templates`, {
                method: 'POST',
                headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
                body: JSON.stringify({ school_name: schoolName, file_identifier: fileIdentifier, pdf_filename: nombreArchivoOriginal, coordinates_json: coordenadasDetectadas })
            });
            if (!res.ok) throw new Error();
            alert("✅ Erfolgreich in Supabase gespeichert!");
        } catch (err) {
            alert("❌ Fehler beim Speichern.");
        }
    });
}
