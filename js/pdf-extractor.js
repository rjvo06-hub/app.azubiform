import { SUPABASE_URL, headers } from './config.js';

export function inicializarLectorYAnalizadorPdf(contenedorId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="space-y-4">
            <div class="flex border-b border-gray-200">
                <button type="button" class="pb-2 px-4 text-xs font-bold text-indigo-600 border-b-2 border-indigo-600 focus:outline-none">🤖 Automatischer PDF-Intelligenz-Scanner & Editor</button>
            </div>

            <div class="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg">
                <h3 class="text-xs font-bold text-indigo-900 uppercase mb-1">Automatische Texterkennung & Visuelle Anpassung</h3>
                <p class="text-xs text-indigo-800">Lade deinen leeren <code class="bg-white px-1 py-0.5 rounded font-bold">admin.pdf</code> hoch. Das System scannt die Felder, zeigt eine Vorschau und erlaubt dir, die Boxen per Drag & Drop direkt auf dem PDF zu verschieben.</p>
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

            <!-- Contenedor de Vista Previa Interactiva (PDF + Capa de Cajas Arrastrables) -->
            <div id="resultadoAnalisisAuto" class="hidden space-y-4">
                <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 text-xs">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2 text-emerald-600 font-bold">
                            <span>✅</span> <span id="lblEstadoEscaneo">PDF erfolgreich analysiert! Ziehe die Boxen auf dem Dokument, um sie anzupassen.</span>
                        </div>
                    </div>

                    <!-- Zona de Visualización del PDF con Overlay -->
                    <div class="relative overflow-auto border border-gray-300 rounded-lg bg-gray-900 flex justify-center p-2 max-h-[600px]" id="pdfContainerView">
                        <div class="relative inline-block" id="pdfCanvasWrapper">
                            <canvas id="pdfCanvas" class="block shadow-lg"></canvas>
                            <div id="pdfOverlay" class="absolute inset-0 pointer-events-none"></div>
                        </div>
                    </div>
                </div>

                <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 text-xs">
                    <h4 class="font-bold text-gray-700 uppercase text-[10px]">JSON de Coordenadas Actualizadas:</h4>
                    <div id="logCoordenadasDetectadas" class="bg-gray-50 p-3 rounded-lg font-mono text-[10px] text-gray-600 max-h-40 overflow-y-auto border border-gray-200"></div>
                    <button type="button" id="btnGuardarAutoSupabase" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow transition">💾 In "school_templates" speichern</button>
                </div>
            </div>
        </div>
    `;

    const inputArchivo = contenedor.querySelector('#inputArchivoAuto');
    const divResultado = contenedor.querySelector('#resultadoAnalisisAuto');
    const logCoordenadas = contenedor.querySelector('#logCoordenadasDetectadas');
    const btnGuardar = contenedor.querySelector('#btnGuardarAutoSupabase');
    const inputSchoolName = contenedor.querySelector('#inputSchoolName');
    const inputFileIdentifier = contenedor.querySelector('#inputFileIdentifier');
    const canvas = contenedor.querySelector('#pdfCanvas');
    const overlay = contenedor.querySelector('#pdfOverlay');

    let coordenadasDetectadas = {};
    let nombreArchivoOriginal = '';
    let pdfPageViewport = null;
    let pdfPageHeight = 0;

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
                
                // Renderizar PDF en Canvas a escala 1.5 para buena definición
                const scale = 1.5;
                pdfPageViewport = pagina.getViewport({ scale });
                pdfPageHeight = pdfPageViewport.height;

                const context = canvas.getContext('2d');
                canvas.height = pdfPageViewport.height;
                canvas.width = pdfPageViewport.width;

                await pagina.render({ canvasContext: context, viewport: pdfPageViewport }).promise;

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
                    if (texto.includes('Wochenbericht')) {
                        coordenadasDetectadas.wochenbericht_bloque = { x1: x + 100, y1: y - 4, x2: x + 250, y2: y + 10 };
                    }
                    if (texto.includes('Ausbildungsstätte')) {
                        coordenadasDetectadas.ausbildungsstaette = { x1: x + 110, y1: y - 4, x2: x + 260, y2: y + 10 };
                    }
                    if (texto === 'Montag') {
                        coordenadasDetectadas.lunes_texto = { x1: x + 70, y1: y - 5, x2: x + 350, y2: y + 35 };
                        coordenadasDetectadas.lunes_horas = { x1: x + 360, y1: y - 5, x2: x + 420, y2: y + 35 };
                    }
                    if (texto === 'Dienstag') {
                        coordenadasDetectadas.martes_texto = { x1: x + 70, y1: y - 5, x2: x + 350, y2: y + 35 };
                        coordenadasDetectadas.martes_horas = { x1: x + 360, y1: y - 5, x2: x + 420, y2: y + 35 };
                    }
                    if (texto === 'Mittwoch') {
                        coordenadasDetectadas.miercoles_texto = { x1: x + 70, y1: y - 5, x2: x + 350, y2: y + 35 };
                        coordenadasDetectadas.miercoles_horas = { x1: x + 360, y1: y - 5, x2: x + 420, y2: y + 35 };
                    }
                    if (texto === 'Donnerstag') {
                        coordenadasDetectadas.jueves_texto = { x1: x + 70, y1: y - 5, x2: x + 350, y2: y + 35 };
                        coordenadasDetectadas.jueves_horas = { x1: x + 360, y1: y - 5, x2: x + 420, y2: y + 35 };
                    }
                    if (texto === 'Freitag') {
                        coordenadasDetectadas.viernes_texto = { x1: x + 70, y1: y - 5, x2: x + 350, y2: y + 35 };
                        coordenadasDetectadas.viernes_horas = { x1: x + 360, y1: y - 5, x2: x + 420, y2: y + 35 };
                    }
                });

                renderizarCajasOverlay();
                divResultado.classList.remove('hidden');

            } catch (err) {
                console.error("Fehler beim Scannen:", err);
                alert("❌ Fehler beim automatischen Auslesen des PDFs.");
            }
        };
        lector.readAsArrayBuffer(archivo);
    });

    // Función para convertir coordenadas PDF a Píxeles de Canvas y viceversa
    function pdfToCanvasCoords(box) {
        const scale = 1.5;
        // PDF usa origen abajo-izquierda, Canvas usa arriba-izquierda
        const left = box.x1 * scale;
        const top = (pdfPageViewport.rawViewport ? pdfPageViewport.height/scale - box.y2 : (pdfPageHeight / scale - box.y2)) * scale; 
        // Simplificado con la altura total en canvas:
        const canvasTop = pdfPageHeight - (box.y2 * scale);
        const width = (box.x2 - box.x1) * scale;
        const height = (box.y2 - box.y1) * scale;
        return { left, top: canvasTop, width, height };
    }

    function canvasToPdfCoords(left, top, width, height) {
        const scale = 1.5;
        const x1 = left / scale;
        const x2 = (left + width) / scale;
        const y2 = (pdfPageHeight - top) / scale;
        const y1 = (pdfPageHeight - (top + height)) / scale;
        return { x1, y1, x2, y2 };
    }

    function renderizarCajasOverlay() {
        overlay.innerHTML = '';
        logCoordenadas.textContent = JSON.stringify(coordenadasDetectadas, null, 2);

        for (const [key, box] of Object.entries(coordenadasDetectadas)) {
            const pos = pdfToCanvasCoords(box);

            const elBox = document.createElement('div');
            elBox.className = 'absolute pointer-events-auto border-2 border-indigo-500 bg-indigo-500/20 hover:bg-indigo-500/40 cursor-move rounded flex items-center justify-center text-[9px] font-bold text-white shadow transition-colors';
            elBox.style.left = `${pos.left}px`;
            elBox.style.top = `${pos.top}px`;
            elBox.style.width = `${Math.max(pos.width, 30)}px`;
            elBox.style.height = `${Math.max(pos.height, 15)}px`;
            elBox.innerHTML = `<span class="bg-indigo-900/80 px-1 rounded truncate pointer-events-none">${key}</span>`;

            // Lógica de Arrastre (Drag & Drop) Directo sobre el Overlay
            let isDragging = false;
            let startX, startY;

            elBox.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX - elBox.offsetLeft;
                startY = e.clientY - elBox.offsetTop;
                e.stopPropagation();
            });

            window.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                let newLeft = e.clientX - startX;
                let newTop = e.clientY - startY;

                elBox.style.left = `${newLeft}px`;
                elBox.style.top = `${newTop}px`;
            });

            window.addEventListener('mouseup', () => {
                if (!isDragging) return;
                isDragging = false;

                // Actualizar coordenadas en el objeto principal tras soltar
                const updated = canvasToPdfCoords(
                    elBox.offsetLeft, 
                    elBox.offsetTop, 
                    elBox.offsetWidth, 
                    elBox.offsetHeight
                );

                coordenadasDetectadas[key] = {
                    x1: updated.x1,
                    y1: updated.y1,
                    x2: updated.x2,
                    y2: updated.y2
                };

                logCoordenadas.textContent = JSON.stringify(coordenadasDetectadas, null, 2);
            });

            overlay.appendChild(elBox);
        }
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

            alert("✅ Vorlage erfolgreich in der Tabelle 'school_templates' gespeichert!");
        } catch (err) {
            console.error("Fehler beim Speichern in school_templates:", err);
            alert("❌ Fehler: " + err.message);
        }
    });
}

// Exponer la función cambiarTab globalmente por compatibilidad con el HTML principal
window.cambiarTab = function(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        if (tab.id === tabName) {
            tab.classList.remove('hidden');
        } else {
            tab.classList.add('hidden');
        }
    });
};
