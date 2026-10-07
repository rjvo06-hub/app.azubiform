import { SUPABASE_URL, headers } from './config.js';

export function inicializarLectorYAnalizadorPdf(contenedorId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="space-y-4">
            <div class="flex border-b border-gray-200 space-x-4">
                <button type="button" id="tabEditor" onclick="cambiarTabPdf('editor')" class="pb-2 px-4 text-xs font-bold text-indigo-600 border-b-2 border-indigo-600 focus:outline-none">🤖 Editor & Drag-and-Drop</button>
                <button type="button" id="tabConsulta" onclick="cambiarTabPdf('consulta')" class="pb-2 px-4 text-xs font-semibold text-gray-400 border-b-2 border-transparent hover:text-gray-600 focus:outline-none">🔍 Gespeicherte Vorlagen abfragen & bearbeiten</button>
            </div>

            <!-- SECCIÓN 1: EDITOR -->
            <div id="seccionEditor" class="space-y-4">
                <div class="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg">
                    <h3 class="text-xs font-bold text-indigo-900 uppercase mb-1">Präzises Feld-Mapping (Drag & Drop oder manuelle Feineinstellung)</h3>
                    <p class="text-xs text-indigo-800">Ziehe die Felder auf dem PDF oder passe die exakten X/Y-Werte in der rechten Seitenleiste an.</p>
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
                        <label class="block text-[10px] font-bold text-gray-700 uppercase mb-1">3. Leere PDF-Vorlage hochladen (admin.pdf)</label>
                        <input type="file" id="inputArchivoAuto" accept="application/pdf" class="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer">
                    </div>
                </div>

                <div id="resultadoAnalisisAuto" class="hidden bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4 text-xs">
                    <div class="flex items-center space-x-2 text-emerald-600 font-bold">
                        <span>✅</span> <span id="lblEstadoEscaneo">PDF analysiert! Passe die Positionen per Drag & Drop oder manuell an:</span>
                    </div>
                    
                    <div class="flex flex-col lg:flex-row gap-4">
                        <div class="relative overflow-auto border border-gray-300 rounded-lg bg-gray-100 p-2 flex justify-center items-start flex-1 max-h-[600px]">
                            <div id="canvasWrapperPreview" class="relative inline-block shadow-md bg-white select-none">
                                <canvas id="pdfPreviewCanvas" class="block"></canvas>
                                <div id="pdfPreviewOverlay" class="absolute inset-0"></div>
                            </div>
                        </div>

                        <!-- PANEL LATERAL CON CONTROLES MANUALES -->
                        <div class="w-full lg:w-80 bg-gray-50 border border-gray-200 p-3 rounded-lg flex flex-col max-h-[600px] overflow-y-auto">
                            <h4 class="font-bold text-gray-700 uppercase text-[11px] mb-2 border-b pb-1">Felder & Manuelle Feineinstellung</h4>
                            <div id="panelElementosLista" class="space-y-2 flex-1"></div>
                        </div>
                    </div>

                    <div class="flex justify-between items-center pt-2 border-t">
                        <span class="text-[10px] text-gray-500 uppercase font-bold">Aktualisierter JSON-Code (live):</span>
                    </div>
                    <div id="logCoordenadasDetectadas" class="bg-gray-50 p-3 rounded-lg font-mono text-[10px] text-gray-600 max-h-32 overflow-y-auto border border-gray-200"></div>
                    
                    <button type="button" id="btnGuardarAutoSupabase" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow transition">💾 In "school_templates" speichern</button>
                </div>
            </div>

            <!-- SECCIÓN 2: CONSULTA Y AUDITORÍA DE PLANTILLAS -->
            <div id="seccionConsulta" class="space-y-4 hidden">
                <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                    <div class="flex justify-between items-center">
                        <h3 class="text-xs font-bold text-gray-800 uppercase">In Supabase gespeicherte Vorlagen (Audit & Bearbeitung)</h3>
                        <button type="button" id="btnRecargarPlantillas" class="bg-indigo-50 text-indigo-600 font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition">🔄 Liste aktualisieren</button>
                    </div>
                    <div id="listaPlantillasGuardadas" class="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                        <p class="text-xs text-gray-400 text-center py-8">Lade gespeicherte Vorlagen...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    window.cambiarTabPdf = function(tab) {
        const secEditor = contenedor.querySelector('#seccionEditor');
        const secConsulta = contenedor.querySelector('#seccionConsulta');
        const btnEditor = contenedor.querySelector('#tabEditor');
        const btnConsulta = contenedor.querySelector('#tabConsulta');

        if (tab === 'editor') {
            secEditor.classList.remove('hidden');
            secConsulta.classList.add('hidden');
            btnEditor.className = "pb-2 px-4 text-xs font-bold text-indigo-600 border-b-2 border-indigo-600 focus:outline-none";
            btnConsulta.className = "pb-2 px-4 text-xs font-semibold text-gray-400 border-b-2 border-transparent hover:text-gray-600 focus:outline-none";
        } else {
            secEditor.classList.add('hidden');
            secConsulta.classList.remove('hidden');
            btnConsulta.className = "pb-2 px-4 text-xs font-bold text-indigo-600 border-b-2 border-indigo-600 focus:outline-none";
            btnEditor.className = "pb-2 px-4 text-xs font-semibold text-gray-400 border-b-2 border-transparent hover:text-gray-600 focus:outline-none";
            cargarPlantillasGuardadas();
        }
    };

    let coordenadasDetectadas = {};
    let nombreArchivoOriginal = 'admin.pdf';
    let renderScale = 1.25;

    const textosEjemplo = {
        nombre: "Katharina Schwarz",
        wochenbericht_nr: "Nr. 12",
        semana_inicio: "05.10.2026",
        semana_fin: "09.10.2026",
        klasse: "FOS 12W",
        ausbildungsrichtung: "Sozialwesen",
        betreuende_lehrkraft: "Frau Müller",
        ausbildungsstaette: "Kindergarten Sonnenschein",
        lunes_texto: "Einführung in die Abteilung",
        lunes_horas: "8 Std.",
        martes_texto: "Betreuung von Projekten",
        martes_horas: "8 Std.",
        miércoles_texto: "Dokumentation im Betrieb",
        miércoles_horas: "7 Std.",
        jueves_texto: "Unterstützung im Gruppenalltag",
        jueves_horas: "8 Std.",
        viernes_texto: "Wochenreflexion",
        viernes_horas: "6 Std.",
        total_horas: "37 Std."
    };

    async function cargarPlantillasGuardadas() {
        const listaDiv = contenedor.querySelector('#listaPlantillasGuardadas');
        listaDiv.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">Wird geladen...</p>`;

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/school_templates?select=*`, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) throw new Error("Fehler beim Laden der Vorlagen.");
            const plantillas = await response.json();

            if (!plantillas || plantillas.length === 0) {
                listaDiv.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">Keine gespeicherten Vorlagen gefunden.</p>`;
                return;
            }

            let html = '';
            plantillas.forEach((tpl) => {
                const jsonStr = encodeURIComponent(JSON.stringify(tpl.coordinates_json || {}));
                html += `
                    <div class="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                        <div class="flex justify-between items-center">
                            <div>
                                <span class="font-bold text-gray-800 text-xs">${tpl.school_name || 'Unbekannte Schule'}</span>
                                <span class="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded ml-2">${tpl.file_identifier || 'N/A'}</span>
                            </div>
                            <div class="space-x-2 flex items-center">
                                <button type="button" onclick="cargarPlantillaParaEditar('${encodeURIComponent(tpl.school_name)}', '${encodeURIComponent(tpl.file_identifier)}', '${jsonStr}')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2.5 py-1 rounded shadow">✏️ Bearbeiten</button>
                            </div>
                        </div>
                        <details class="text-[10px] bg-white p-2 rounded border border-gray-200">
                            <summary class="font-semibold text-indigo-600 cursor-pointer">Koordinaten-JSON anzeigen (Audit)</summary>
                            <pre class="mt-2 font-mono text-gray-600 overflow-x-auto max-h-32">${JSON.stringify(tpl.coordinates_json, null, 2)}</pre>
                        </details>
                    </div>
                `;
            });

            listaDiv.innerHTML = html;
        } catch (err) {
            console.error("Fehler beim Abfragen:", err);
            listaDiv.innerHTML = `<p class="text-xs text-red-500 text-center py-4">Fehler beim Laden der Daten.</p>`;
        }
    }

    // Función global para cargar una plantilla guardada directo en el editor visual
    window.cargarPlantillaParaEditar = async function(schoolNameEnc, fileIdentifierEnc, jsonStrEnc) {
        const schoolName = decodeURIComponent(schoolNameEnc);
        const fileIdentifier = decodeURIComponent(fileIdentifierEnc);
        const coords = JSON.parse(decodeURIComponent(jsonStrEnc));

        contenedor.querySelector('#inputSchoolName').value = schoolName;
        contenedor.querySelector('#inputFileIdentifier').value = fileIdentifier;
        coordenadasDetectadas = coords;

        // Cambiar a la pestaña del editor
        window.cambiarTabPdf('editor');

        // Renderizar el PDF de fondo y cargar las coordenadas en el editor interactivo
        try {
            const loadingTask = pdfjsLib.getDocument('./admin.pdf');
            const pdfDoc = await loadingTask.promise;
            const pagina = await pdfDoc.getPage(1);
            
            const viewport = pagina.getViewport({ scale: renderScale });
            const context = canvas.getContext('2d');

            canvas.height = viewport.height;
            canvas.width = viewport.width;
            canvas.style.width = `${viewport.width / renderScale}px`;
            canvas.style.height = `${viewport.height / renderScale}px`;

            await pagina.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            renderizarEditorVisual(viewport);
            divResultado.classList.remove('hidden');
            alert(`✅ Vorlage "${schoolName}" erfolgreich in den Editor geladen! Du kannst sie jetzt anpassen.`);
        } catch (err) {
            console.error("Fehler beim Laden des PDFs:", err);
            alert("❌ Fehler beim Laden der PDF-Datei für den Editor.");
        }
    };

    contenedor.querySelector('#btnRecargarPlantillas').addEventListener('click', cargarPlantillasGuardadas);

    const inputArchivo = contenedor.querySelector('#inputArchivoAuto');
    const divResultado = contenedor.querySelector('#resultadoAnalisisAuto');
    const logCoordenadas = contenedor.querySelector('#logCoordenadasDetectadas');
    const btnGuardar = contenedor.querySelector('#btnGuardarAutoSupabase');
    const inputSchoolName = contenedor.querySelector('#inputSchoolName');
    const inputFileIdentifier = contenedor.querySelector('#inputFileIdentifier');
    const canvas = contenedor.querySelector('#pdfPreviewCanvas');
    const overlay = contenedor.querySelector('#pdfPreviewOverlay');
    const panelLista = contenedor.querySelector('#panelElementosLista');

    inputArchivo.addEventListener('change', async (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;
        nombreArchivoOriginal = archivo.name;

        const lector = new FileReader();
        lector.onload = async function() {
            const typedarray = new Uint8Array(this.result);
            try {
                const pdfDoc = await pdfjsLib.getDocument(typedarray).promise;
                const pagina = await pdfDoc.getPage(1);
                
                const viewport = pagina.getViewport({ scale: renderScale });
                const context = canvas.getContext('2d');

                canvas.height = viewport.height;
                canvas.width = viewport.width;
                canvas.style.width = `${viewport.width / renderScale}px`;
                canvas.style.height = `${viewport.height / renderScale}px`;

                await pagina.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                coordenadasDetectadas = {
                    nombre: { x1: 150, y1: 750, x2: 300, y2: 765 },
                    wochenbericht_nr: { x1: 150, y1: 715, x2: 200, y2: 730 },
                    semana_inicio: { x1: 220, y1: 715, x2: 280, y2: 730 },
                    semana_fin: { x1: 300, y1: 715, x2: 360, y2: 730 },
                    klasse: { x1: 100, y1: 670, x2: 200, y2: 685 },
                    ausbildungsrichtung: { x1: 350, y1: 670, x2: 480, y2: 685 },
                    betreuende_lehrkraft: { x1: 350, y1: 750, x2: 480, y2: 765 },
                    ausbildungsstaette: { x1: 350, y1: 715, x2: 480, y2: 730 },
                    lunes_texto: { x1: 120, y1: 540, x2: 400, y2: 555 },
                    lunes_horas: { x1: 450, y1: 540, x2: 500, y2: 555 },
                    martes_texto: { x1: 120, y1: 480, x2: 400, y2: 495 },
                    martes_horas: { x1: 450, y1: 480, x2: 500, y2: 495 },
                    miércoles_texto: { x1: 120, y1: 420, x2: 400, y2: 435 },
                    miércoles_horas: { x1: 450, y1: 420, x2: 500, y2: 435 },
                    jueves_texto: { x1: 120, y1: 360, x2: 400, y2: 375 },
                    jueves_horas: { x1: 450, y1: 360, x2: 500, y2: 375 },
                    viernes_texto: { x1: 120, y1: 300, x2: 400, y2: 315 },
                    viernes_horas: { x1: 450, y1: 300, x2: 500, y2: 315 },
                    total_horas: { x1: 450, y1: 150, x2: 500, y2: 165 }
                };

                renderizarEditorVisual(viewport);
                divResultado.classList.remove('hidden');

            } catch (err) {
                console.error("Fehler beim Scannen:", err);
                alert("❌ Fehler beim automatischen Auslesen des PDFs.");
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
            div.className = "absolute cursor-move bg-amber-100/90 border border-amber-400 text-black font-sans text-[10px] font-medium px-1.5 py-0.5 rounded shadow-sm select-none flex items-center";
            div.style.zIndex = "10";
            
            let left = c.x1 * scaleFactor;
            let top = (842 - c.y2) * scaleFactor;

            div.style.left = `${left}px`;
            div.style.top = `${top}px`;
            div.textContent = `${key}: ${textosEjemplo[key] || 'Text'}`;

            const card = document.createElement('div');
            card.className = "bg-white p-2 rounded border border-gray-200 text-[10px] space-y-1 shadow-xs";
            card.innerHTML = `
                <div class="font-bold text-gray-800 uppercase">${key}</div>
                <div class="flex gap-1 items-center">
                    <span>X:</span>
                    <input type="number" data-coord-key="${key}" data-coord-type="x" value="${Math.round(c.x1)}" class="w-16 px-1 py-0.5 border rounded text-[10px] text-center">
                    <span>Y:</span>
                    <input type="number" data-coord-key="${key}" data-coord-type="y" value="${Math.round(c.y1)}" class="w-16 px-1 py-0.5 border rounded text-[10px] text-center">
                </div>
            `;
            panelLista.appendChild(card);

            card.querySelectorAll('input').forEach(input => {
                input.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const type = e.target.getAttribute('data-coord-type');
                    
                    if (type === 'x') {
                        coordenadasDetectadas[key].x1 = val;
                        coordenadasDetectadas[key].x2 = val + 120;
                    } else {
                        coordenadasDetectadas[key].y1 = val;
                        coordenadasDetectadas[key].y2 = val + 15;
                    }

                    let newLeft = coordenadasDetectadas[key].x1 * scaleFactor;
                    let newTop = (842 - coordenadasDetectadas[key].y2) * scaleFactor;
                    div.style.left = `${newLeft}px`;
                    div.style.top = `${newTop}px`;

                    logCoordenadas.textContent = JSON.stringify(coordenadasDetectadas, null, 2);
                });
            });

            let isDragging = false;
            let startX, startY;

            div.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX - div.offsetLeft;
                startY = e.clientY - div.offsetTop;
                div.style.zIndex = "100";
                div.style.borderColor = "#4f46e5";
                e.stopPropagation();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                let newX = e.clientX - startX;
                let newY = e.clientY - startY;

                div.style.left = `${newX}px`;
                div.style.top = `${newY}px`;

                const realX1 = newX / scaleFactor;
                const realY2 = 842 - (newY / scaleFactor);
                
                coordenadasDetectadas[key].x1 = realX1;
                coordenadasDetectadas[key].x2 = realX1 + 120;
                coordenadasDetectadas[key].y2 = realY2;
                coordenadasDetectadas[key].y1 = realY2 - 15;

                const inputX = card.querySelector(`[data-coord-type="x"]`);
                const inputY = card.querySelector(`[data-coord-type="y"]`);
                if (inputX) inputX.value = Math.round(realX1);
                if (inputY) inputY.value = Math.round(coordenadasDetectadas[key].y1);

                const paresDias = [
                    ['lunes_texto', 'lunes_horas'],
                    ['martes_texto', 'martes_horas'],
                    ['miércoles_texto', 'miércoles_horas'],
                    ['jueves_texto', 'jueves_horas'],
                    ['viernes_texto', 'viernes_horas']
                ];

                paresDias.forEach(([txtKey, horaKey]) => {
                    if (key === txtKey && coordenadasDetectadas[horaKey]) {
                        coordenadasDetectadas[horaKey].y1 = coordenadasDetectadas[key].y1;
                        coordenadasDetectadas[horaKey].y2 = coordenadasDetectadas[key].y2;
                        const horaDiv = overlay.querySelector(`[data-field="${horaKey}"]`);
                        if (horaDiv) horaDiv.style.top = `${(842 - coordenadasDetectadas[horaKey].y2) * scaleFactor}px`;
                    } else if (key === horaKey && coordenadasDetectadas
