export function inicializarLectorYAnalizadorPdf(contenedorId, supabaseClient) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    let coordenadasMapeadas = {
        nombre: null,              // Será un rectángulo {x1, y1, x2, y2}
        betreuende_lehrkraft: null,
        klasse: null,
        ausbildungsrichtung: null,
        semana_numero: null,
        ausbildungsstaette: null,
        semana_inicio: null,
        lunes: [],                 // Cada día será una caja de bloque completa
        martes: [],
        miércoles: [],
        jueves: [],
        viernes: []
    };

    let pdfDocGlobal = null;
    let paginaActualGlobal = null;
    let escalaGlobal = 1.5;
    let pasoActual = 1;
    let puntoTemporalInicio = null; // Para capturar el primer click de la caja

    const pasosConfig = [
        { id: 1, campo: 'nombre', titulo: '1. Ziehe ein Rechteck um das Feld: "Schüler/in" (Klicke Start- und Endpunkt)' },
        { id: 2, campo: 'betreuende_lehrkraft', titulo: '2. Ziehe ein Rechteck um: "Betreuende Lehrkraft"' },
        { id: 3, campo: 'klasse', titulo: '3. Ziehe ein Rechteck um: "Klasse"' },
        { id: 4, campo: 'ausbildungsrichtung', titulo: '4. Ziehe ein Rechteck um: "Ausbildungsrichtung"' },
        { id: 5, campo: 'semana_numero', titulo: '5. Ziehe ein Rechteck um: "Wochenbericht Nr."' },
        { id: 6, campo: 'ausbildungsstaette', titulo: '6. Ziehe ein Rechteck um: "Ausbildungsstätte"' },
        { id: 7, campo: 'semana_inicio', titulo: '7. Ziehe ein Rechteck um den Datumsbereich ("Von / Bis")' },
        { id: 8, campo: 'lunes', titulo: '8. Ziehe ein Rechteck um den GESAMTEN KASTEN des MONTAGS (Inhalt passt sich automatisch an)' },
        { id: 9, campo: 'martes', titulo: '9. Ziehe ein Rechteck um den Kasten des DIENSTAGS' },
        { id: 10, campo: 'miércoles', titulo: '10. Ziehe ein Rechteck um den Kasten des MITTWOCHS' },
        { id: 11, campo: 'jueves', titulo: '11. Ziehe ein Rechteck um den Kasten des DONNERSTAGS' },
        { id: 12, campo: 'viernes', titulo: '12. Ziehe ein Rechteck um den Kasten des FREITAGS' },
        { id: 13, campo: 'listo', titulo: '🎉 Alle Bereiche erfolgreich erfasst! Du kannst die Vorlage jetzt speichern.' }
    ];

    contenedor.innerHTML = `
        <div class="space-y-4">
            <div class="flex border-b border-gray-200">
                <button type="button" class="pb-2 px-4 text-xs font-bold text-amber-600 border-b-2 border-amber-600 focus:outline-none">🪄 Rechteck-Assistent (Box-Auswahl)</button>
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
                        <span class="text-[10px] text-amber-400 font-bold uppercase tracking-wide block">Schritt <span id="lblPasoNum">1</span> von 12</span>
                        <h4 id="lblInstruccionPaso" class="text-xs sm:text-sm font-bold text-white">Ziehe ein Rechteck...</h4>
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
            dibujarCajasVisuales();
        });
    }

    function actualizarInstruccionUI() {
        const pasoObj = pasosConfig.find(p => p.id === pasoActual);
        if (pasoObj) {
            lblPasoNum.textContent = pasoActual;
            lblInstruccionPaso.textContent = !puntoTemporalInicio ? pasoObj.titulo : "👉 Klicke nun auf die andere diagonale Ecke (Endpunkt des Rechtecks)";
        }
        if (pasoActual > 12) {
            lblInstruccionPaso.textContent = "🎉 Alle Bereiche erfolgreich erfasst! Du kannst die Vorlage speichern.";
            btnGuardar.classList.remove('hidden');
        }
    }

    // Lógica de selección por 2 clics (Esquina 1 y Esquina 2 para formar la caja)
    canvas.addEventListener('click', (e) => {
        if (pasoActual > 12) return;

        const rect = canvas.getBoundingClientRect();
        const xReal = (e.clientX - rect.left) / escalaGlobal;
        const yReal = (e.clientY - rect.top) / escalaGlobal;

        if (!puntoTemporalInicio) {
            // Primer clic: Esquina superior izquierda
            puntoTemporalInicio = { x: xReal, y: yReal };
            actualizarInstruccionUI();
        } else {
            // Segundo clic: Esquina inferior derecha (forma el rectángulo)
            const x1 = Math.min(puntoTemporalInicio.x, xReal);
            const y1 = Math.min(puntoTemporalInicio.y, yReal);
            const x2 = Math.max(puntoTemporalInicio.x, xReal);
            const y2 = Math.max(puntoTemporalInicio.y, yReal);

            const caja = { x1, y1, x2, y2 };
            const pasoObj = pasosConfig.find(p => p.id === pasoActual);
            const campo = pasoObj.campo;

            if (['lunes', 'martes', 'miércoles', 'jueves', 'viernes'].includes(campo)) {
                coordenadasMapeadas[campo] = caja; // Guardamos la caja completa del día
            } else {
                coordenadasMapeadas[campo] = caja; // Guardamos la caja del campo de texto
            }

            puntoTemporalInicio = null;
            pasoActual++;
            actualizarInstruccionUI();
            dibujarCajasVisuales();
        }
    });

    function dibujarCajasVisuales() {
        capaPines.innerHTML = '';
        const todasCajas = [];

        if (coordenadasMapeadas.nombre) todasCajas.push({ label: 'Name', ...coordenadasMapeadas.nombre });
        if (coordenadasMapeadas.betreuende_lehrkraft) todasCajas.push({ label: 'Lehrkraft', ...coordenadasMapeadas.betreuende_lehrkraft });
        if (coordenadasMapeadas.klasse) todasCajas.push({ label: 'Klasse', ...coordenadasMapeadas.klasse });
        if (coordenadasMapeadas.ausbildungsrichtung) todasCajas.push({ label: 'Ausb.Richt.', ...coordenadasMapeadas.ausbildungsrichtung });
        if (coordenadasMapeadas.semana_numero) todasCajas.push({ label: 'Nr.', ...coordenadasMapeadas.semana_numero });
        if (coordenadasMapeadas.ausbildungsstaette) todasCajas.push({ label: 'Stätte', ...coordenadasMapeadas.ausbildungsstaette });
        if (coordenadasMapeadas.semana_inicio) todasCajas.push({ label: 'Datum', ...coordenadasMapeadas.semana_inicio });

        ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'].forEach(dia => {
            if (coordenadasMapeadas[dia]) {
                todasCajas.push({ label: dia.toUpperCase(), ...coordenadasMapeadas[dia] });
            }
        });

        todasCajas.forEach(c => {
            const divCaja = document.createElement('div');
            divCaja.className = 'absolute border-2 border-amber-500 bg-amber-500 bg-opacity-20 pointer-events-none flex items-start p-0.5';
            divCaja.style.left = (c.x1 * escalaGlobal) + 'px';
            divCaja.style.top = (c.y1 * escalaGlobal) + 'px';
            divCaja.style.width = ((c.x2 - c.x1) * escalaGlobal) + 'px';
            divCaja.style.height = ((c.y2 - c.y1) * escalaGlobal) + 'px';

            const etiqueta = document.createElement('span');
            etiqueta.className = 'bg-amber-600 text-white text-[9px] font-bold px-1 rounded';
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

            alert("✅ Vorlage mit Rechteck-Bereichen erfolgreich gespeichert!");
            modalZoom.classList.add('hidden');
        } catch (err) {
            console.error("Error al guardar en Supabase:", err);
            alert("❌ Fehler beim Speichern der Vorlage: " + err.message);
        }
    });
}
