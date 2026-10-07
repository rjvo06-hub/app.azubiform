export function inicializarLectorYAnalizadorPdf(contenedorId, supabaseClient) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    let coordenadasMapeadas = {
        nombre: null,
        betreuende_lehrkraft: null,
        klasse: null,
        ausbildungsrichtung: null,
        semana_numero: null,
        ausbildungsstaette: null,
        semana_inicio: null,
        lunes: null,
        martes: null,
        miércoles: null,
        jueves: null,
        viernes: null
    };

    let pdfDocGlobal = null;
    let paginaActualGlobal = null;
    let escalaGlobal = 1.5;
    let pasoActual = 1;
    let puntoTemporalInicio = null;

    const pasosConfig = [
        { id: 1, campo: 'nombre', titulo: '1. Ziehe ein Rechteck um: "Schüler/in"' },
        { id: 2, campo: 'betreuende_lehrkraft', titulo: '2. Ziehe ein Rechteck um: "Betreuende Lehrkraft"' },
        { id: 3, campo: 'klasse', titulo: '3. Ziehe ein Rechteck um: "Klasse"' },
        { id: 4, campo: 'ausbildungsrichtung', titulo: '4. Ziehe ein Rechteck um: "Ausbildungsrichtung"' },
        { id: 5, campo: 'semana_numero', titulo: '5. Ziehe ein Rechteck um: "Wochenbericht Nr."' },
        { id: 6, campo: 'ausbildungsstaette', titulo: '6. Ziehe ein Rechteck um: "Ausbildungsstätte"' },
        { id: 7, campo: 'semana_inicio', titulo: '7. Ziehe ein Rechteck um das Datumsfeld ("Von / Bis")' },
        { id: 8, campo: 'lunes', titulo: '8. Ziehe ein Rechteck um den MONTAGS-Kasten (Die anderen Tage passen sich automatisch an)' },
        { id: 9, campo: 'listo', titulo: '🎉 Alle Bereiche erfasst! Du kannst die Vorlage jetzt speichern oder Felder korrigieren.' }
    ];

    contenedor.innerHTML = `
        <div class="space-y-4">
            <div class="flex border-b border-gray-200">
                <button type="button" class="pb-2 px-4 text-xs font-bold text-amber-600 border-b-2 border-amber-600 focus:outline-none">🪄 Präziser Rechteck-Assistent</button>
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

        <!-- VENTANA EMERGENTE (MODAL A PANTALLA COMPLETA REAL PARA MAPEAR CAJAS) -->
        <div id="modalZoomPdf" class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center hidden z-[99999] p-2 sm:p-6">
            <div class="w-full max-w-7xl bg-white rounded-2xl shadow-2xl relative flex flex-col h-[95vh]">
                <div class="p-4 bg-gray-900 text-white rounded-t-2xl flex flex-wrap justify-between items-center gap-3 flex-shrink-0">
                    <div>
                        <span class="text-[10px] text-amber-400 font-bold uppercase tracking-wide block">Schritt <span id="lblPasoNum">1</span> von 8</span>
                        <h4 id="lblInstruccionPaso" class="text-xs sm:text-sm font-bold text-white">Ziehe ein Rechteck...</h4>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button type="button" id="btnZoomOut" class="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg">🔍- Zoom</button>
                        <button type="button" id="btnZoomIn" class="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg">🔍+ Zoom</button>
                        <button type="button" id="btnReiniciarMapeo" class="bg-amber-800 hover:bg-amber-700 text-white text-xs px-3 py-1.5 rounded-lg">🔄 Neu starten</button>
                        <button type="button" id="btnCerrarModalZoom" class="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-3 py-1.5 rounded-lg">✕ Schließen</button>
                    </div>
                </div>

                <!-- CONTENEDOR WRAPPER RELATIVO ESTRICTAMENTE AJUSTADO AL TAMAÑO DEL CANVAS -->
                <div class="relative bg-gray-300 flex-1 overflow-auto flex p-6" id="zonaCanvasPdfModal">
                    <div id="wrapperCanvas" class="relative m-auto shadow-2xl bg-white">
                        <canvas id="pdfCanvasInspector" class="block cursor-crosshair"></canvas>
                        <div id="capaPines" class="absolute inset-0 pointer-events-none"></div>
                    </div>
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
    const wrapperCanvas = contenedor.querySelector('#wrapperCanvas');

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

        // Ajustar el contenedor envolvente exactamente al tamaño del canvas escalado
        wrapperCanvas.style.width = viewport.width + 'px';
        wrapperCanvas.style.height = viewport.height + 'px';

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        paginaActualGlobal.render(renderContext).promise.then(() => {
            dibujarCajasVisuales();
        });
    }

    function actualizarInstruccionUI() {
        const pasoObj = pasosConfig.find(p => p.id === pasoActual);
        if (pasoObj) {
            lblPasoNum.textContent = pasoActual;
            lblInstruccionPaso.textContent = !puntoTemporalInicio ? pasoObj.titulo : "👉 Klicke nun auf die andere diagonale Ecke, um das Rechteck zu schließen";
        }
        if (pasoActual > 8) {
            lblInstruccionPaso.textContent = "🎉 Alle Bereiche erfolgreich erfasst! Du kannst speichern.";
            btnGuardar.classList.remove('hidden');
        }
    }

    // Coordenadas medido directamente sobre el canvas de forma exacta
    canvas.addEventListener('click', (e) => {
        if (pasoActual > 8) return;

        const rect = canvas.getBoundingClientRect();
        const xReal = (e.clientX - rect.left) / escalaGlobal;
        const yReal = (e.clientY - rect.top) / escalaGlobal;

        if (!puntoTemporalInicio) {
            puntoTemporalInicio = { x: xReal, y: yReal };
            actualizarInstruccionUI();
        } else {
            const x1 = Math.min(puntoTemporalInicio.x, xReal);
            const y1 = Math.min(puntoTemporalInicio.y, yReal);
            const x2 = Math.max(puntoTemporalInicio.x, xReal);
            const y2 = Math.max(puntoTemporalInicio.y, yReal);

            const caja = { x1, y1, x2, y2 };
            const pasoObj = pasosConfig.find(p => p.id === pasoActual);
            const campo = pasoObj.campo;

            if (campo === 'lunes') {
                coordenadasMapeadas.lunes = caja;
                const altoCaja = y2 - y1;
                const separacionFila = altoCaja + 4;

                coordenadasMapeadas.martes = { x1, y1: y1 + separacionFila, x2, y2: y2 + separacionFila };
                coordenadasMapeadas.miércoles = { x1, y1: y1 + (separacionFila * 2), x2, y2: y2 + (separacionFila * 2) };
                coordenadasMapeadas.jueves = { x1, y1: y1 + (separacionFila * 3), x2, y2: y2 + (separacionFila * 3) };
                coordenadasMapeadas.viernes = { x1, y1: y1 + (separacionFila * 4), x2, y2: y2 + (separacionFila * 4) };
            } else {
                coordenadasMapeadas[campo] = caja;
            }

            puntoTemporalInicio = null;
            pasoActual++;
            actualizarInstruccionUI();
            dibujarCajasVisuales();
        }
    });

    function dibujarCajasVisuales() {
        capaPines.innerHTML = '';
        const todasCajas = [
            { key: 'nombre', label: 'Name', ...coordenadasMapeadas.nombre },
            { key: 'betreuende_lehrkraft', label: 'Lehrkraft', ...coordenadasMapeadas.betreuende_lehrkraft },
            { key: 'klasse', label: 'Klasse', ...coordenadasMapeadas.klasse },
            { key: 'ausbildungsrichtung', label: 'Ausb.Richt.', ...coordenadasMapeadas.ausbildungsrichtung },
            { key: 'semana_numero', label: 'Nr.', ...coordenadasMapeadas.semana_numero },
            { key: 'ausbildungsstaette', label: 'Stätte', ...coordenadasMapeadas.ausbildungsstaette },
            { key: 'semana_inicio', label: 'Datum', ...coordenadasMapeadas.semana_inicio },
            { key: 'lunes', label: 'MONTAG', ...coordenadasMapeadas.lunes },
            { key: 'martes', label: 'DIENSTAG', ...coordenadasMapeadas.martes },
            { key: 'miércoles', label: 'MITTWOCH', ...coordenadasMapeadas.miércoles },
            { key: 'jueves', label: 'DONNERSTAG', ...coordenadasMapeadas.jueves },
            { key: 'viernes', label: 'FREITAG', ...coordenadasMapeadas.viernes }
        ];

        todasCajas.forEach(c => {
            if (!c.x1) return;
            const divCaja = document.createElement('div');
            divCaja.className = 'absolute border-2 border-indigo-600 bg-indigo-500 bg-opacity-25 flex items-start p-1 cursor-pointer hover:bg-opacity-40 transition shadow-sm pointer-events-auto';
            divCaja.style.left = (c.x1 * escalaGlobal) + 'px';
            divCaja.style.top = (c.y1 * escalaGlobal) + 'px';
            divCaja.style.width = ((c.x2 - c.x1) * escalaGlobal) + 'px';
            divCaja.style.height = ((c.y2 - c.y1) * escalaGlobal) + 'px';
            divCaja.title = `Klicken zum Korrigieren: ${c.label}`;

            divCaja.addEventListener('click', (ev) => {
                ev.stopPropagation();
                if (confirm(`Möchtest du das Feld "${c.label}" neu erfassen?`)) {
                    coordenadasMapeadas[c.key] = null;
                    if (['lunes', 'martes', 'miércoles', 'jueves', 'viernes'].includes(c.key)) {
                        coordenadasMapeadas.lunes = null;
                        coordenadasMapeadas.martes = null;
                        coordenadasMapeadas.miércoles = null;
                        coordenadasMapeadas.jueves = null;
                        coordenadasMapeadas.viernes = null;
                        pasoActual = 8;
                    } else {
                        pasoActual = pasosConfig.findIndex(p => p.campo === c.key) + 1;
                    }
                    actualizarInstruccionUI();
                    dibujarCajasVisuales();
                }
            });

            const etiqueta = document.createElement('span');
            etiqueta.className = 'bg-indigo-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow';
            etiqueta.textContent = c.label;
            divCaja.appendChild(etiqueta);

            capaPines.appendChild(divCaja);
        });
    }

    btnReiniciar.addEventListener('click', () => {
        pasoActual = 1;
        puntoTemporalInicio = null;
        coordenadasMapeadas = { nombre: null, betreuende_lehrkraft: null, klasse: null, ausbildungsrichtung: null, semana_numero: null, ausbildungsstaette: null, semana_inicio: null, lunes: null, martes: null, miércoles: null, jueves: null, viernes: null };
        actualizarInstruccionUI();
        dibujarCajasVisuales();
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
