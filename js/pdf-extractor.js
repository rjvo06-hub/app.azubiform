export function inicializarLectorYAnalizadorPdf(contenedorId, supabaseClient) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    let coordenadasMapeadas = {
        nombre: null,
        klasse: null,
        ausbildung: null,
        semana_numero: null,
        semana_inicio: null,
        semana_fin: null,
        ano: null,
        lunes: [],
        martes: [],
        miércoles: [],
        jueves: [],
        viernes: []
    };

    let pdfDocGlobal = null;
    let paginaActualGlobal = null;
    let escalaGlobal = 1.5;
    let pasoActual = 1;

    // Pasos amplificados para cubrir absolutamente todos los datos impresos en el PDF
    const pasosConfig = [
        { id: 1, campo: 'nombre', titulo: 'Klicke auf das Feld neben: "Schüler/in / Schüler"' },
        { id: 2, campo: 'klasse', titulo: 'Klicke auf das Feld neben: "Klasse"' },
        { id: 3, campo: 'ausbildung', titulo: 'Klicke auf das Feld neben: "Ausbildungsrichtung / Beruf"' },
        { id: 4, campo: 'semana_numero', titulo: 'Klicke auf das Feld neben: "Wochenbericht Nr."' },
        { id: 5, campo: 'semana_inicio', titulo: 'Klicke auf das Datumsfeld nach: "... vom" (Startdatum)' },
        { id: 6, campo: 'semana_fin', titulo: 'Klicke auf das Enddatum-Feld (bis)' },
        { id: 7, campo: 'ano', titulo: 'Klicke auf das Feld für das Jahr' },
        { id: 8, campo: 'lunes_1', titulo: 'Klicke auf die ERSTE Zeile bei: "Montag" (Wochen-Aktivitäten)' },
        { id: 9, campo: 'martes_1', titulo: 'Klicke auf die ERSTE Zeile bei: "Dienstag"' },
        { id: 10, campo: 'miércoles_1', titulo: 'Klicke auf die ERSTE Zeile bei: "Mittwoch"' },
        { id: 11, campo: 'jueves_1', titulo: 'Klicke auf die ERSTE Zeile bei: "Donnerstag"' },
        { id: 12, campo: 'viernes_1', titulo: 'Klicke auf die ERSTE Zeile bei: "Freitag"' },
        { id: 13, campo: 'listo', titulo: '🎉 Alle Felder erfolgreich erfasst! Du kannst die Vorlage speichern.' }
    ];

    contenedor.innerHTML = `
        <div class="space-y-4">
            <div class="flex border-b border-gray-200">
                <button type="button" class="pb-2 px-4 text-xs font-bold text-amber-600 border-b-2 border-amber-600 focus:outline-none">🪄 Vollständiger Vorlagen-Assistent</button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <label class="block text-[10px] font-bold text-gray-700 uppercase mb-1">Name der Schule / Vorlage</label>
                    <input type="text" id="inputNombrePlantilla" placeholder="z.B. FOS Holzkirchen" class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-gray-700 uppercase mb-1">Eindeutiger Code (ID)</label>
                    <input type="text" id="inputCodigoPlantilla" placeholder="z.B. fos_holzkirchen" class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none">
                </div>
            </div>

            <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                <div class="w-full">
                    <label class="block text-[10px] font-bold text-gray-700 uppercase mb-1">Leere PDF-Datei hochladen</label>
                    <input type="file" id="inputArchivoPlantilla" accept="application/pdf" class="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer">
                </div>
                <button type="button" id="btnAbrirModalZoom" class="hidden w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition flex-shrink-0">🔍 In Großansicht öffnen</button>
            </div>

            <div class="flex justify-end pt-2">
                <button type="button" id="btnGuardarPlantillaSupabase" class="hidden bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition">💾 Vorlage in Supabase speichern</button>
            </div>
        </div>

        <!-- VENTANA EMERGENTE (MODAL A PANTALLA COMPLETA REAL PARA MAPEAR) -->
        <div id="modalZoomPdf" class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center hidden z-[99999] p-2 sm:p-6">
            <div class="w-full max-w-7xl bg-white rounded-2xl shadow-2xl relative flex flex-col h-[95vh]">
                <div class="p-4 bg-gray-900 text-white rounded-t-2xl flex flex-wrap justify-between items-center gap-3 flex-shrink-0">
                    <div>
                        <span class="text-[10px] text-amber-400 font-bold uppercase tracking-wide block">Schritt <span id="lblPasoNum">1</span> von 12</span>
                        <h4 id="lblInstruccionPaso" class="text-xs sm:text-sm font-bold text-white">Klicke auf das Feld</h4>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button type="button" id="btnZoomOut" class="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg">🔍- Zoom</button>
                        <button type="button" id="btnZoomIn" class="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg">🔍+ Zoom</button>
                        <button type="button" id="btnReiniciarMapeo" class="bg-amber-800 hover:bg-amber-700 text-white text-xs px-3 py-1.5 rounded-lg">🔄 Neu starten</button>
                        <button type="button" id="btnCerrarModalZoom" class="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-3 py-1.5 rounded-lg">✕ Schließen</button>
                    </div>
                </div>

                <div class="relative bg-gray-300 flex-1 overflow-auto flex justify-center p-6" id="zonaCanvasPdfModal">
                    <canvas id="pdfCanvasInspector" class="shadow-2xl bg-white cursor-crosshair m-auto"></canvas>
                    <div id="capaPines" class="absolute inset-0 pointer-events-none"></div>
                </div>
            </div>
        </div>
    `;

    const inputArchivo = contenedor.querySelector('#inputArchivoPlantilla');
    const btnAbrirModal = contenedor.querySelector('#btnAbrirModalZoom');
    const modalZoom = contenedor.querySelector('#modalZoomPdf');
    const btnCerrarModal = contenedor.querySelector('#btnCerrarModalZoom');
    const lblPasoNum = contenedor.querySelector('#lblPasoNum');
    const lblInstruccionPaso = contenedor.querySelector('#lblInstruccionPaso');
    const btnReiniciar = contenedor.querySelector('#btnReiniciarMapeo');
    const btnGuardar = contenedor.querySelector('#btnGuardarPlantillaSupabase');
    const btnZoomIn = contenedor.querySelector('#btnZoomIn');
    const btnZoomOut = contenedor.querySelector('#btnZoomOut');
    const canvas = contenedor.querySelector('#pdfCanvasInspector');
    const ctx = canvas.getContext('2d');
    const capaPines = contenedor.querySelector('#capaPines');

    inputArchivo.addEventListener('change', async (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;

        const lector = new FileReader();
        lector.onload = async function() {
            const typedarray = new Uint8Array(this.result);
            try {
                pdfDocGlobal = await pdfjsLib.getDocument(typedarray).promise;
                paginaActualGlobal = await pdfDocGlobal.getPage(1);
                renderizarPaginaPDF();
                btnAbrirModal.classList.remove('hidden');
                modalZoom.classList.remove('hidden');
                actualizarInstruccionUI();
            } catch (err) {
                console.error("Error al leer el PDF:", err);
                alert("Fehler beim Lesen der PDF-Datei.");
            }
        };
        lector.readAsArrayBuffer(archivo);
    });

    btnAbrirModal.addEventListener('click', () => {
        modalZoom.classList.remove('hidden');
        renderizarPaginaPDF();
    });

    btnCerrarModal.addEventListener('click', () => {
        modalZoom.classList.add('hidden');
    });

    btnZoomIn.addEventListener('click', () => {
        escalaGlobal = Math.min(escalaGlobal + 0.3, 3.0);
        renderizarPaginaPDF();
    });

    btnZoomOut.addEventListener('click', () => {
        escalaGlobal = Math.max(escalaGlobal - 0.3, 1.0);
        renderizarPaginaPDF();
    });

    function renderizarPaginaPDF() {
        if (!paginaActualGlobal) return;
        const viewport = paginaActualGlobal.getViewport({ scale: escalaGlobal });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        paginaActualGlobal.render(renderContext).promise.then(() => {
            dibujarPinesVisuales();
        });
    }

    function actualizarInstruccionUI() {
        const pasoObj = pasosConfig.find(p => p.id === pasoActual);
        if (pasoObj) {
            lblPasoNum.textContent = pasoActual;
            lblInstruccionPaso.textContent = pasoObj.titulo;
        }
        if (pasoActual > 12) {
            lblInstruccionPaso.textContent = "🎉 Alle Felder erfolgreich erfasst! Du kannst die Vorlage speichern.";
            btnGuardar.classList.remove('hidden');
        }
    }

    canvas.addEventListener('click', (e) => {
        if (pasoActual > 12) return;

        const rect = canvas.getBoundingClientRect();
        const xClickPx = e.clientX - rect.left;
        const yClickPx = e.clientY - rect.top;

        const xReal = xClickPx / escalaGlobal;
        const yReal = yClickPx / escalaGlobal;

        const pasoObj = pasosConfig.find(p => p.id === pasoActual);
        if (!pasoObj) return;

        const campo = pasoObj.campo;

        if (campo === 'nombre') {
            coordenadasMapeadas.nombre = { x: xReal, y: yReal };
        } else if (campo === 'klasse') {
            coordenadasMapeadas.klasse = { x: xReal, y: yReal };
        } else if (campo === 'ausbildung') {
            coordenadasMapeadas.ausbildung = { x: xReal, y: yReal };
        } else if (campo === 'semana_numero') {
            coordenadasMapeadas.semana_numero = { x: xReal, y: yReal };
        } else if (campo === 'semana_inicio') {
            coordenadasMapeadas.semana_inicio = { x: xReal, y: yReal };
        } else if (campo === 'semana_fin') {
            coordenadasMapeadas.semana_fin = { x: xReal, y: yReal };
        } else if (campo === 'ano') {
            coordenadasMapeadas.ano = { x: xReal, y: yReal };
        } else if (campo.includes('_1')) {
            const dia = campo.split('_')[0];
            coordenadasMapeadas[dia] = [];
            const espacioEntreLineas = 16;

            for (let i = 0; i < 6; i++) {
                coordenadasMapeadas[dia].push({
                    x: xReal,
                    y: yReal + (i * espacioEntreLineas)
                });
            }
        }

        pasoActual++;
        actualizarInstruccionUI();
        dibujarPinesVisuales();
    });

    function dibujarPinesVisuales() {
        capaPines.innerHTML = '';
        const todosPuntos = [];

        if (coordenadasMapeadas.nombre) todosPuntos.push({ label: 'Name', ...coordenadasMapeadas.nombre });
        if (coordenadasMapeadas.klasse) todosPuntos.push({ label: 'Klasse', ...coordenadasMapeadas.klasse });
        if (coordenadasMapeadas.ausbildung) todosPuntos.push({ label: 'Ausb.', ...coordenadasMapeadas.ausbildung });
        if (coordenadasMapeadas.semana_numero) todosPuntos.push({ label: 'Nr.', ...coordenadasMapeadas.semana_numero });
        if (coordenadasMapeadas.semana_inicio) todosPuntos.push({ label: 'Von', ...coordenadasMapeadas.semana_inicio });
        if (coordenadasMapeadas.semana_fin) todosPuntos.push({ label: 'Bis', ...coordenadasMapeadas.semana_fin });
        if (coordenadasMapeadas.ano) todosPuntos.push({ label: 'Jahr', ...coordenadasMapeadas.ano });

        ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'].forEach(dia => {
            coordenadasMapeadas[dia].forEach((pt, idx) => {
                todosPuntos.push({ label: `${dia[0].toUpperCase()}${idx+1}`, ...pt });
            });
        });

        todosPuntos.forEach(pt => {
            const pin = document.createElement('div');
            pin.className = 'absolute bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center';
            pin.style.left = (pt.x * escalaGlobal) + 'px';
            pin.style.top = (pt.y * escalaGlobal) + 'px';
            pin.textContent = pt.label;
            capaPines.appendChild(pin);
        });
    }

    btnReiniciar.addEventListener('click', () => {
        pasoActual = 1;
        coordenadasMapeadas = { nombre: null, klasse: null, ausbildung: null, semana_numero: null, semana_inicio: null, semana_fin: null, ano: null, lunes: [], martes: [], miércoles: [], jueves: [], viernes: [] };
        actualizarInstruccionUI();
        dibujarPinesVisuales();
    });

    btnGuardar.addEventListener('click', async () => {
        const nombrePlantilla = contenedor.querySelector('#inputNombrePlantilla').value.trim();
        const codigoPlantilla = contenedor.querySelector('#inputCodigoPlantilla').value.trim();

        if (!nombrePlantilla || !codigoPlantilla) {
            alert("Bitte gib den Namen und den eindeutigen Code der Vorlage ein.");
            return;
        }

        if (!supabaseClient) {
            alert("Supabase-Client nicht verfügbar.");
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('plantillas_pdf')
                .upsert({
                    codigo: codigoPlantilla,
                    nombre: nombrePlantilla,
                    coordenadas: coordenadasMapeadas
                }, { onConflict: 'codigo' });

            if (error) throw error;

            alert("✅ Vorlage erfolgreich in Supabase gespeichert!");
            modalZoom.classList.add('hidden');
        } catch (err) {
            console.error("Error al guardar en Supabase:", err);
            alert("❌ Fehler beim Speichern der Vorlage: " + err.message);
        }
    });
}
