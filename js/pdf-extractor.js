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
                <h3 class="text-xs font-bold text-indigo-900 uppercase mb-1">Visuelles Feld-Mapping mit Seitenleiste & Auto-Ausrichtung</h3>
                <p class="text-xs text-indigo-800">Alle Felder sind rechts aufgelistet. Ziehe sie auf das PDF. <strong>Aktivität und Stunden für jeden Tag rasten automatisch auf dieselbe horizontale Höhe ein!</strong></p>
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
                    <span>✅</span> <span id="lblEstadoEscaneo">PDF analysiert! Platziere alle Felder im Dokument:</span>
                </div>
                
                <!-- CONTENEDOR PRINCIPAL CON VISTA PREVIA Y PANEL LATERAL -->
                <div class="flex flex-col lg:flex-row gap-4">
                    <!-- VISTA PREVIA DEL PDF -->
                    <div class="relative overflow-auto border border-gray-300 rounded-lg bg-gray-100 p-2 flex justify-center items-start flex-1 max-h-[600px]">
                        <div id="canvasWrapperPreview" class="relative inline-block shadow-md bg-white select-none">
                            <canvas id="pdfPreviewCanvas" class="block"></canvas>
                            <div id="pdfPreviewOverlay" class="absolute inset-0"></div>
                        </div>
                    </div>

                    <!-- PANEL LATERAL DE ELEMENTOS -->
                    <div class="w-full lg:w-72 bg-gray-50 border border-gray-200 p-3 rounded-lg flex flex-col max-h-[600px] overflow-y-auto">
                        <h4 class="font-bold text-gray-700 uppercase text-[11px] mb-2 border-b pb-1">Verfügbare Felder (Zum Verschieben)</h4>
                        <div id="panelElementosLista" class="space-y-1.5 flex-1">
                            <!-- Se generan dinámicamente -->
                        </div>
                    </div>
                </div>

                <div class="flex justify-between items-center pt-2 border-t">
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
    const panelLista = contenedor.querySelector('#panelElementosLista');

    let coordenadasDetectadas = {};
    let nombreArchivoOriginal = '';
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
                
                // Coordenadas iniciales predeterminadas organizadas y completas
                coordenadasDetectadas = {
                    nombre: { x1: 150, y1: 750, x2: 300, y2: 765 },
                    wochenbericht_nr: { x1: 100, y1: 700, x2: 160, y2: 715 },
                    semana_inicio: { x1: 200, y1: 700, x2: 260, y2: 715 },
                    semana_fin: { x1: 280, y1: 700, x2: 340, y2: 715 },
                    klasse: { x1: 100, y1: 670, x2: 200, y2: 685 },
                    ausbildungsrichtung: { x1: 350, y1: 670, x2: 480, y2: 685 },
                    betreuende_lehrkraft: { x1: 350, y1: 750, x2: 480, y2: 765 },
                    ausbildungsstaette: { x1: 350, y1: 700, x2: 480, y2: 715 },
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

                // Inteligencia para ubicar etiquetas si se detectan en el texto del PDF
                elementosTexto.forEach(item => {
                    const texto = item.str.trim();
                    const tx = item.transform; 
                    const x = tx[4];
                    const y = tx[5];

                    if (texto.includes('Schüler')) coordenadasDetectadas.nombre = { x1: x + 80, y1: y - 4, x2: x + 230, y2: y + 10 };
                    if (texto === 'Klasse') coordenadasDetectadas.klasse = { x1: x + 40, y1: y - 4, x2: x + 140, y2: y + 10 };
                    if (texto.includes('Ausbildungsrichtung')) coordenadasDetectadas.ausbildungsrichtung = { x1: x + 100, y1: y - 4, x2: x + 250, y2: y + 10 };
                    if (texto.includes('Betreuende')) coordenadasDetectadas.betreuende_lehrkraft = { x1: x + 100, y1: y - 4, x2: x + 250, y2: y + 10 };
                    if (texto.includes('Wochenbericht')) coordenadasDetectadas.wochenbericht_nr = { x1: x + 100, y1: y - 4, x2: x + 160, y2: y + 10 };
                    if (texto.includes('Ausbildungsstätte')) coordenadasDetectadas.ausbildungsstaette = { x1: x + 100, y1: y - 4, x2: x + 250, y2: y + 10 };
                });

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

            // 1. Crear elemento visual arrastrable sobre el canvas
            const div = document.createElement('div');
            div.className = "absolute cursor-move bg-amber-100/90 border border-amber-400 text-black font-sans text-[10px] font-medium px-1.5 py-0.5 rounded shadow-sm select-none flex items-center";
            div.style.zIndex = "10";
            
            let left = c.x1 * scaleFactor;
            let top = (842 - c.y2) * scaleFactor;

            div.style.left = `${left}px`;
            div.style.top = `${top}px`;
            div.textContent = `${key}: ${textosEjemplo[key] || 'Text'}`;

            // 2. Crear tarjeta en el panel lateral ordenado de arriba a baja
            const card = document.createElement('div');
            card.className = "bg-white p-1.5 rounded border border-gray-200 text-[10px] font-medium text-gray-700 flex justify-between items-center shadow-xs";
            card.innerHTML = `<span><strong>${key}</strong></span> <span class="text-indigo-600 text-[9px]">Aktiv</span>`;
            panelLista.appendChild(card);

            // Lógica de arrastrar y soltar (Drag and Drop) con ALINEACIÓN HORIZONTAL AUTOMÁTICA para días y horas
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
                coords[key].x2 = realX1 + 120;
                coords[key].y2 = realY2;
                coords[key].y1 = realY2 - 15;

                // 🔄 AUTO-ALINEACIÓN HORIZONTAL: Si mueven el texto de un día, la hora se alinea en su misma altura (y viceversa)
                const paresDias = [
                    ['lunes_texto', 'lunes_horas'],
                    ['martes_texto', 'martes_horas'],
                    ['miércoles_texto', 'miércoles_horas'],
                    ['jueves_texto', 'jueves_horas'],
                    ['viernes_texto', 'viernes_horas']
                ];

                paresDias.forEach(([txtKey, horaKey]) => {
                    if (key === txtKey && coords[horaKey]) {
                        coords[horaKey].y1 = coords[key].y1;
                        coords[horaKey].y2 = coords[key].y2;
                        // Actualizar visualmente la cajita de la hora en el DOM si existe
                        const horaDiv = overlay.querySelector(`[data-field="${horaKey}"]`);
                        if (horaDiv) horaDiv.style.top = `${(842 - coords[horaKey].y2) * scaleFactor}px`;
                    } else if (key === horaKey && coords[txtKey]) {
                        coords[txtKey].y1 = coords[key].y1;
                        coords[txtKey].y2 = coords[key].y2;
                        const txtDiv = overlay.querySelector(`[data-field="${txtKey}"]`);
                        if (txtDiv) txtDiv.style.top = `${(842 - coords[txtKey].y2) * scaleFactor}px`;
                    }
                });

                logCoordenadas.textContent = JSON.stringify(coords, null, 2);
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    div.style.zIndex = "10";
                    div.style.borderColor = "#fbbf24";
                }
            });

            div.setAttribute('data-field', key);
            overlay.appendChild(div);
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

            alert("✅ Vorlage und perfekt ausgerichtete Positionen erfolgreich in Supabase gespeichert!");
        } catch (err) {
            console.error("Fehler beim Speichern in school_templates:", err);
            alert("❌ Fehler: " + err.message);
        }
    });
}
