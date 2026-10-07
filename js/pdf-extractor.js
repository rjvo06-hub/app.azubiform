export function inicializarLectorYAnalizadorPdf(contenedorId, supabaseClient) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    let coordenadasMapeadas = {
        nombre: null,
        betreuende_lehrkraft: null,
        klasse: null,
        ausbildungsrichtung: null,
        wochenbericht_bloque: null,
        ausbildungsstaette: null,
        lunes_texto: null,
        lunes_horas: null,
        martes_texto: null,
        martes_horas: null,
        miércoles_texto: null,
        miércoles_horas: null,
        jueves_texto: null,
        jueves_horas: null,
        viernes_texto: null,
        viernes_horas: null
    };

    let pdfDocGlobal = null;
    let paginaActualGlobal = null;
    let escalaGlobal = 1.5;
    let pasoActual = 1;
    let puntoTemporalInicio = null;

    const pasosConfig = [
        { id: 1, campo: 'nombre', label: 'Schüler/in', titulo: '1. Ziehe ein Rechteck um: "Schüler/in"' },
        { id: 2, campo: 'betreuende_lehrkraft', label: 'Lehrkraft', titulo: '2. Ziehe ein Rechteck um: "Betreuende Lehrkraft"' },
        { id: 3, campo: 'klasse', label: 'Klasse', titulo: '3. Ziehe ein Rechteck um: "Klasse"' },
        { id: 4, campo: 'ausbildungsrichtung', label: 'Ausb.Richtung', titulo: '4. Ziehe ein Rechteck um: "Ausbildungsrichtung"' },
        { id: 5, campo: 'wochenbericht_bloque', label: 'Wochenbericht', titulo: '5. Ziehe ein Rechteck über den GESAMTEN Bereich: "Wochenbericht Nr. ... vom ... bis ..."' },
        { id: 6, campo: 'ausbildungsstaette', label: 'Stätte', titulo: '6. Ziehe ein Rechteck um: "Ausbildungsstätte"' },
        { id: 7, campo: 'lunes_texto', label: 'Montag Text', titulo: '7. Ziehe ein Rechteck für den Textbereich von MONTAG' },
        { id: 8, campo: 'lunes_horas', label: 'Montag Std.', titulo: '8. Ziehe ein Rechteck für die STUNDEN von MONTAG' },
        { id: 9, campo: 'martes_texto', label: 'Dienstag Text', titulo: '9. Ziehe ein Rechteck für den Textbereich von DIENSTAG' },
        { id: 10, campo: 'martes_horas', label: 'Dienstag Std.', titulo: '10. Ziehe ein Rechteck für die STUNDEN von DIENSTAG' },
        { id: 11, campo: 'miércoles_texto', label: 'Mittwoch Text', titulo: '11. Ziehe ein Rechteck für den Textbereich von MITTWOCH' },
        { id: 12, campo: 'miércoles_horas', label: 'Mittwoch Std.', titulo: '12. Ziehe ein Rechteck für die STUNDEN von MITTWOCH' },
        { id: 13, campo: 'jueves_texto', label: 'Donnerstag Text', titulo: '13. Ziehe ein Rechteck für den Textbereich von DONNERSTAG' },
        { id: 14, campo: 'jueves_horas', label: 'Donnerstag Std.', titulo: '14. Ziehe ein Rechteck für die STUNDEN von DONNERSTAG' },
        { id: 15, campo: 'viernes_texto', label: 'Freitag Text', titulo: '15. Ziehe ein Rechteck für den Textbereich von FREITAG' },
        { id: 16, campo: 'viernes_horas', label: 'Freitag Std.', titulo: '16. Ziehe ein Rechteck für die STUNDEN von FREITAG' },
        { id: 17, campo: 'listo', label: 'Fertig', titulo: '🎉 Alle Bereiche erfolgreich erfasst! Du kannst die Vorlage speichern.' }
    ];

    contenedor.innerHTML = `
        <div class="space-y-4">
            <div class="flex border-b border-gray-200">
                <button type="button" class="pb-2 px-4 text-xs font-bold text-amber-600 border-b-2 border-amber-600 focus:outline-none">🪄 Präziser Rechteck-Assistent (Schritt für Schritt)</button>
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
                        <span class="text-[10px] text-amber-400 font-bold uppercase tracking-wide block">Schritt <span id="lblPasoNum">1</span> von 16</span>
                        <h4 id="lblInstruccionPaso" class="text-xs sm:text-sm font-bold text-white">Ziehe ein Rechteck...</h4>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button type="button" id="btnZoomOut" class="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg">🔍- Zoom</button>
                        <button type="button" id="btnZoomIn" class="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg">🔍+ Zoom</button>
                        <button type="button" id="btnReiniciarMapeo" class="bg-amber-800 hover:bg-amber-700 text-white text-xs px-3 py-1.5 rounded-lg">🔄 Neu starten</button>
                        <button type="button" id="btnCerrarModalZoom" class="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-3 py-1.5 rounded-lg">✕ Schließen</button>
                    </div>
                </div>

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
        if (pasoActual > 16) {
            lblInstruccionPaso.textContent = "🎉 Alle Bereiche erfolgreich erfasst! Du kannst speichern.";
            btnGuardar.classList.remove('hidden');
        }
    }

    canvas.addEventListener('click', (e) => {
        if (pasoActual > 16) return;

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

            coordenadasMapeadas[campo] = caja;

            puntoTemporalInicio = null;
            pasoActual++;
            actualizarInstruccionUI();
            dibujarCajasVisuales();
        }
    });

    function dibujarCajasVisuales() {
        capaPines.innerHTML = '';
        pasosConfig.forEach(p => {
            if (p.campo === 'listo') return;
            const c = coordenadasMapeadas[p.campo];
            if (!c || !c.x1) return;

            const divCaja = document.createElement('div');
            divCaja.className = 'absolute border-2 border-indigo-600 bg-indigo-500 bg-opacity-25 flex items-start p-1 cursor-pointer hover:bg-opacity-40 transition shadow-sm pointer-events-auto';
            divCaja.style.left = (c.x1 * escalaGlobal) + 'px';
            divCaja.style.top = (c.y1 * escalaGlobal) + 'px';
            divCaja.style.width = ((c.x2 - c.x1) * escalaGlobal) + 'px';
            divCaja.style.height = ((c.y2 - c.y1) * escalaGlobal) + 'px';
            divCaja.title = `Klicken zum Korrigieren: ${p.label}`;

            divCaja.addEventListener('click', (ev) => {
                ev.stopPropagation();
                if (confirm(`Möchtest du das Feld "${p.label}" neu erfassen?`)) {
                    coordenadasMapeadas[p.campo] = null;
                    pasoActual = p.id;
                    puntoTemporalInicio = null;
                    actualizarInstruccionUI();
                    dibujarCajasVisuales();
                }
            });

            const etiqueta = document.createElement('span');
            etiqueta.className = 'bg-indigo-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow';
            etiqueta.textContent = p.label;
            divCaja.appendChild(etiqueta);

            capaPines.appendChild(divCaja);
        });
    }

    btnReiniciar.addEventListener('click', () => {
        pasoActual = 1;
        puntoTemporalInicio = null;
        Object.keys(coordenadasMapeadas).forEach(k => coordenadasMapeadas[k] = null);
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
