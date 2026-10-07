import { SUPABASE_URL, headers } from './config.js';

export function inicializarLectorYAnalizadorPdf(contenedorId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="space-y-4">
            <div class="flex border-b border-gray-200">
                <button type="button" class="pb-2 px-4 text-xs font-bold text-indigo-600 border-b-2 border-indigo-600 focus:outline-none">🤖 Interaktiver PDF-Editor & Drag-and-Drop</button>
            </div>

            <div class="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg">
                <h3 class="text-xs font-bold text-indigo-900 uppercase mb-1">Visuelles Feld-Mapping per Drag & Drop (inkl. Stunden & Total)</h3>
                <p class="text-xs text-indigo-800">Lade dein PDF hoch. Alle erkannten Felder (Texte, Stunden und Gesamtsumme) werden angezeigt. Ziehe sie an die exakte Position und speichere sie in <code class="font-bold">school_templates</code>.</p>
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
                    <span>✅</span> <span id="lblEstadoEscaneo">PDF analysiert! Platziere auch die Stunden und die Gesamtsumme an der richtigen Stelle:</span>
                </div>
                
                <!-- VISTA PREVIA INTERACTIVA CON DRAG & DROP -->
                <div class="relative overflow-auto border border-gray-300 rounded-lg bg-gray-100 p-2 flex justify-center max-h-[550px]">
                    <div id="canvasWrapperPreview" class="relative inline-block shadow-md bg-white select-none">
                        <canvas id="pdfPreviewCanvas" class="block"></canvas>
                        <div id="pdfPreviewOverlay" class="absolute inset-0"></div>
                    </div>
                </div>

                <div class="flex justify-between items-center">
                    <span class="text-[10px] text-gray-500 uppercase font-bold">Aktualisierter JSON-Code (live):</span>
                </div>
                <div id="logCoordenadasDetectadas" class="bg-gray-50 p-3 rounded-lg font-mono text-[10px] text-gray-600 max-h-32 overflow-y-auto border border-gray-200"></div>
                
                <button type="button" id="btnGuardarAutoSupabase" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow transition">💾 In "school_templates" speichern</button>
            </div>
        </div>
    `;

    const inputArchivo = contenedor.querySelector('#inputArchivoAuto');
    const divResultado = contenedor.querySelector('#resultadoAnalisisAuto');
    const logCoordenadas = contenedor.querySelector('#logCoordenadasDetectadas');
    const btnGuardar = contenedor.querySelector('#btnGuardarAutoSupabase');
    const inputSchoolName = contenedor.querySelector('#inputSchoolName');
    const inputFileIdentifier = contenedor.querySelector('#inputFileIdentifier');
    const canvas = contenedor.querySelector('#pdfPreviewCanvas');
    const overlay = contenedor.querySelector('#pdfPreviewOverlay');

    let coordenadasDetectadas = {};
    let nombreArchivoOriginal = '';
    let renderScale = 1.25;

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

                const textContent = await pagina.getTextContent();
                let elementosTexto = textContent.items;
                coordenadasDetectadas = {};

                elementosTexto.forEach(item => {
                    const texto = item.str.trim();
                    const tx = item.transform; 
                    const x = tx[4];
                    const y = tx[5];

                    if (texto.includes('Schüler') || texto.includes('Schülerin')) {
                        coordenadasDetectadas.nombre = { x1: x + 100, y1: y - 4, x2: x + 250, y2: y + 10 };
                    }
                    if (texto === 'Klasse') {
                        coordenadasDetectadas.klasse = { x1: x + 50, y1: y - 4, x2: x + 150, y2: y + 10 };
                    }
                    if (texto.includes('Ausbildungsrichtung')) {
                        coordenadasDetectadas.ausbildungsrichtung = { x1: x + 110, y1: y - 4, x2: x + 260, y2: y + 10 };
                    }
                    if (texto.includes('Betreuende')) {
                        coordenadasDetectadas.betreuende_lehrkraft = { x1: x + 110, y1: y - 4, x2: x + 260, y2: y + 10 };
                    }
                    if (texto === 'Montag') {
                        coordenadasDetectadas.lunes_texto = { x1: x + 70, y1: y - 5, x2: x + 350, y2: y + 35 };
                        coordenadasDetectadas.lunes_horas = { x1: x + 360, y1: y - 5, x2: x + 430, y2: y + 35 };
                    }
                    if (texto === 'Dienstag') {
                        coordenadasDetectadas.martes_texto = { x1: x + 70, y1: y - 5, x2: x + 350, y2: y + 35 };
                        coordenadasDetectadas.martes_horas = { x1: x + 360, y1: y - 5, x2: x + 430, y2: y + 35 };
                    }
                    if (texto === 'Mittwoch') {
                        coordenadasDetectadas.miércoles_texto = { x1: x + 70, y1: y - 5, x2: x + 350, y2: y + 35 };
                        coordenadasDetectadas.miércoles_horas = { x1: x + 360, y1: y - 5, x2: x + 430, y2: y + 35 };
                    }
                    if (texto === 'Donnerstag') {
                        coordenadasDetectadas.jueves_texto = { x1: x + 70, y1: y - 5, x2: x + 350, y2: y + 35 };
                        coordenadasDetectadas.jueves_horas = { x1: x + 360, y1: y - 5, x2: x + 430, y2: y + 35 };
                    }
                    if (texto === 'Freitag') {
                        coordenadasDetectadas.viernes_texto = { x1: x + 70, y1: y - 5, x2: x + 350, y2: y + 35 };
                        coordenadasDetectadas.viernes_horas = { x1: x + 360, y1: y - 5, x2: x + 430, y2: y + 35 };
                    }
                    if (texto.includes('Arbeitszeit')) {
                        coordenadasDetectadas.total_horas = { x1: x + 150, y1: y - 4, x2: x + 250, y2: y + 10 };
                    }
                });

                // Textos de referencia incluyendo horas y totalización
                const textosEjemplo = {
                    nombre: "Katharina Schwarz",
                    klasse: "FOS 12W",
                    ausbildungsrichtung: "Sozialwesen",
                    betreuende_lehrkraft: "Frau Müller",
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

                renderizarCajasArrastrables(coordenadasDetectadas, textosEjemplo, viewport);
                divResultado.classList.remove('hidden');

            } catch (err) {
                console.error("Fehler beim Scannen:", err);
                alert("❌ Fehler beim automatischen Auslesen des PDFs.");
            }
        };
        lector.readAsArrayBuffer(archivo);
    });

    function renderizarCajasArrastrables(coords, textos, viewport) {
        overlay.innerHTML = '';
        const scaleFactor = (viewport.width / renderScale) / 595.27;

        Object.keys(coords).forEach(key => {
            const c = coords[key];
            if (c && c.x1 !== undefined) {
                const div = document.createElement('div');
                div.className = "absolute cursor-move bg-amber-100/90 border border-amber-400 text-black font-sans text-[10px] font-medium px-1.5 py-0.5 rounded shadow-sm select-none flex items-center";
                div.style.zIndex = "10";
                
                let left = c.x1 * scaleFactor;
                let top = (842 - c.y2) * scaleFactor;

                div.style.left = `${left}px`;
                div.style.top = `${top}px`;
                div.textContent = `${key}: ${textos[key] || 'Text'}`;

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
                    coords[key].x1 = realX1;
                    coords[key].x2 = realX1 + 100;
                    coords[key].y2 = realY2;
                    coords[key].y1 = realY2 - 15;

                    logCoordenadas.textContent = JSON.stringify(coords, null, 2);
                });

                document.addEventListener('mouseup', () => {
                    if (isDragging) {
                        isDragging = false;
                        div.style.zIndex = "10";
                        div.style.borderColor = "#fbbf24";
                    }
                });

                overlay.appendChild(div);
            }
        });

        logCoordenadas.textContent = JSON.stringify(coords, null, 2);
    }

    btnGuardar.addEventListener('click', async () => {
        const schoolName = inputSchoolName.value.trim();
        const fileIdentifier = inputFileIdentifier.value.trim();

        if (!schoolName || !fileIdentifier) {
            alert("Bitte fülle den Schulnamen und den Bezeichner aus.");
            return;
        }

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/school_templates`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                    school_name: schoolName,
                    file_identifier: fileIdentifier,
                    pdf_filename: nombreArchivoOriginal || 'admin.pdf',
                    coordinates_json: coordenadasDetectadas
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Fehler beim Speichern');
            }

            alert("✅ Vorlage und alle Positionen (inkl. Stunden & Summe) erfolgreich gespeichert!");
        } catch (err) {
            console.error("Fehler beim Speichern in school_templates:", err);
            alert("❌ Fehler: " + err.message);
        }
    });
}
