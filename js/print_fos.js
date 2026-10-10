import { SUPABASE_URL, headers } from './config.js';

export async function inicializarVistaPreviaSemanasFos(containerId, usuarioPreseleccionado = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Estructura interna para el visor y generador automático dentro del modal
    container.innerHTML = `
        <div class="space-y-4">
            <div class="bg-indigo-50 p-3 rounded-lg border border-indigo-200 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div>
                    <h3 class="text-xs font-bold text-indigo-900 uppercase">⚡ Generador Automático Ausbildungsnachweis</h3>
                    <p class="text-[10px] text-indigo-700">Genera el PDF definitivo con las actividades de la semana visualizada.</p>
                </div>
                <div class="flex items-center gap-2 w-full sm:w-auto">
                    <select id="fosSelectSemanaModal" class="p-1.5 border border-indigo-300 rounded text-xs bg-white font-medium flex-1 sm:flex-initial">
                        <option value="">-- Selecciona semana --</option>
                    </select>
                    <button id="btnGenerarPdfModal" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow transition whitespace-nowrap">
                        🚀 Descargar PDF
                    </button>
                </div>
            </div>

            <div class="bg-gray-900 rounded-xl p-2 flex justify-center overflow-auto max-h-[60vh] relative border border-gray-300">
                <div class="relative inline-block shadow-2xl" id="fosCanvasContainerModal">
                    <canvas id="fosPdfCanvasModal" class="block"></canvas>
                    <div id="fosDrawingOverlayModal" class="absolute inset-0 pointer-events-none"></div>
                </div>
            </div>
            <div id="fosEstadoInfoModal" class="text-[10px] font-bold text-indigo-600 bg-indigo-50 p-2 rounded border border-indigo-200 text-center">
                📌 Cargando datos del usuario...
            </div>
        </div>
    `;

    const selectSemanaModal = document.getElementById('fosSelectSemanaModal');
    const btnGenerarPdfModal = document.getElementById('btnGenerarPdfModal');
    const estadoInfoModal = document.getElementById('fosEstadoInfoModal');
    const canvasModal = document.getElementById('fosPdfCanvasModal');
    const drawingOverlayModal = document.getElementById('fosDrawingOverlayModal');

    let pdfDoc = null;
    let pageViewport = null;
    let scale = 1.0;
    let archivoPdfOriginalBytes = null;
    let coordenadasMap = {};
    let semanasAgrupadas = {};
    let registrosGlobales = [];
    let escuelaSeleccionadaId = null;
    let nombreUsuarioActual = usuarioPreseleccionado || localStorage.getItem('usuario_actual');

    if (!nombreUsuarioActual) {
        estadoInfoModal.textContent = "❌ No se encontró un usuario activo.";
        return;
    }

    // 1. Obtener datos del usuario y su escuela/institución asignada desde Supabase
    try {
        estadoInfoModal.textContent = `⏳ Cargando información de ${nombreUsuarioActual}...`;
        
        // Consultamos la tabla de usuarios o perfil para obtener su institución/escuela
        const respUsuario = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?nombre=eq.${encodeURIComponent(nombreUsuarioActual)}&select=*`, {
            headers: { ...headers, 'Range': '0-999' }
        });
        
        if (respUsuario.ok) {
            const dataUsr = await respUsuario.json();
            if (dataUsr.length > 0) {
                // Suponemos que el campo en tu tabla se llama 'escuela', 'institution' o 'file_identifier'
                escuelaSeleccionadaId = dataUsr[0].file_identifier || dataUsr[0].escuela || 'default_school';
            }
        }

        // Si no se encontró en la tabla, asignamos un identificador por defecto o el primero disponible
        if (!escuelaSeleccionadaId) {
            const respTemplates = await fetch(`${SUPABASE_URL}/rest/v1/school_templates?select=file_identifier`, {
                headers: { ...headers, 'Range': '0-9' }
            });
            if (respTemplates.ok) {
                const templates = await respTemplates.json();
                if (templates.length > 0) escuelaSeleccionadaId = templates[0].file_identifier;
            }
        }

        // 2. Cargar coordenadas y plantilla PDF de la escuela
        if (escuelaSeleccionadaId) {
            const respTpl = await fetch(`${SUPABASE_URL}/rest/v1/school_templates?file_identifier=eq.${encodeURIComponent(escuelaSeleccionadaId)}&select=*`, {
                headers: { ...headers, 'Range': '0-999' }
            });
            if (respTpl.ok) {
                const tplData = await respTpl.json();
                if (tplData.length > 0) {
                    coordenadasMap = tplData[0].coordinates_json || {};
                }
            }
        }

        // 3. Cargar el PDF base desde la ruta estática de tu repositorio (ajusta la ruta según tu estructura)
        const rutaPdfBase = `./pdfs/${escuelaSeleccionadaId}.pdf` || './pdfs/default.pdf';
        try {
            const pdfResp = await fetch(rutaPdfBase);
            if (pdfResp.ok) {
                archivoPdfOriginalBytes = await pdfResp.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: archivoPdfOriginalBytes.slice(0) });
                pdfDoc = await loadingTask.promise;
                await renderizarPaginaModal(1);
            } else {
                console.warn("⚠️ No se pudo cargar el PDF base desde la ruta local, se intentará usar respaldo.");
            }
        } catch (e) {
            console.warn("⚠️ Error cargando PDF local:", e);
        }

        // 4. Cargar registros diarios del usuario
        const respReg = await fetch(`${SUPABASE_URL}/rest/v1/registro_diario?usuario=eq.${encodeURIComponent(nombreUsuarioActual)}&select=*`, {
            headers: { ...headers, 'Range': '0-999' }
        });
        if (respReg.ok) {
            registrosGlobales = await respReg.json();
            semanasAgrupadas = agruparRegistrosPorSemana(registrosGlobales);

            selectSemanaModal.innerHTML = '<option value="">-- Selecciona una semana --</option>';
            Object.keys(semanasAgrupadas).forEach(sem => {
                const opt = document.createElement('option');
                opt.value = sem;
                opt.textContent = `Woche: ${sem}`;
                selectSemanaModal.appendChild(opt);
            });
            estadoInfoModal.textContent = `✅ Datos listos para ${nombreUsuarioActual}. Selecciona una semana.`;
        }

    } catch (err) {
        console.error("Error inicializando FOS modal:", err);
        estadoInfoModal.textContent = "❌ Error al cargar los datos de la sesión.";
    }

    async function renderizarPaginaModal(num) {
        if (!pdfDoc) return;
        const page = await pdfDoc.getPage(num);
        pageViewport = page.getViewport({ scale });

        const context = canvasModal.getContext('2d');
        canvasModal.height = pageViewport.height;
        canvasModal.width = pageViewport.width;

        await page.render({ canvasContext: context, viewport: pageViewport }).promise;
        redibujarOverlayModal();
    }

    selectSemanaModal.addEventListener('change', () => {
        if (pdfDoc) redibujarOverlayModal();
    });

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
                semanas[claveSemana] = { lunes: [], dienstag: [], mittwoch: [], donnerstag: [], freitag: [] };
            }

            const d = new Date(reg.fecha).getDay();
            const texto = reg.nombre_actividad || '';

            if (d === 1) semanas[claveSemana].lunes.push(texto);
            else if (d === 2) semanas[claveSemana].dienstag.push(texto);
            else if (d === 3) semanas[claveSemana].mittwoch.push(texto);
            else if (d === 4) semanas[claveSemana].donnerstag.push(texto);
            else if (d === 5) semanas[claveSemana].freitag.push(texto);
        });
        return semanas;
    }

    function redibujarOverlayModal() {
        if (!pageViewport) return;
        drawingOverlayModal.innerHTML = '';

        const semSeleccionada = selectSemanaModal.value;
        const datosSemana = semanasAgrupadas[semSeleccionada] || {};

        for (const [campo, box] of Object.entries(coordenadasMap)) {
            if (!box || typeof box.x1 === 'undefined' || typeof box.y2 === 'undefined') continue;

            const x1 = Number(box.x1);
            const y1 = Number(box.y1);
            const x2 = Number(box.x2);
            const y2 = Number(box.y2);

            const left = x1 * scale;
            const top = pageViewport.height - (y2 * scale);
            const width = Math.max(20, (x2 - x1) * scale);
            const height = Math.max(10, (y2 - y1) * scale);

            const cajaVisual = document.createElement('div');
            cajaVisual.className = `absolute overflow-hidden px-1 font-sans text-black z-10 border border-blue-400/30 bg-blue-50/20 pointer-events-none`;
            cajaVisual.style.left = `${left}px`;
            cajaVisual.style.top = `${top}px`;
            cajaVisual.style.width = `${width}px`;
            cajaVisual.style.height = `${height}px`;

            const lowerKey = campo.toLowerCase();
            let textoAsignado = '';

            if (!lowerKey.includes('stunden') && !lowerKey.includes('hora') && !lowerKey.includes('zeit')) {
                if (lowerKey.includes('montag') || lowerKey.includes('lunes')) textoAsignado = (datosSemana.lunes || []).join('<br>');
                else if (lowerKey.includes('dienstag') || lowerKey.includes('martes')) textoAsignado = (datosSemana.dienstag || []).join('<br>');
                else if (lowerKey.includes('mittwoch') || lowerKey.includes('miercoles')) textoAsignado = (datosSemana.mittwoch || []).join('<br>');
                else if (lowerKey.includes('donnerstag') || lowerKey.includes('jueves')) textoAsignado = (datosSemana.donnerstag || []).join('<br>');
                else if (lowerKey.includes('freitag') || lowerKey.includes('viernes')) textoAsignado = (datosSemana.freitag || []).join('<br>');
                else if (lowerKey.includes('schueler')) textoAsignado = nombreUsuarioActual;
            }

            const contenidoVisual = textoAsignado ? textoAsignado : `<span class="text-gray-400 italic">[${campo}]</span>`;
            cajaVisual.innerHTML = `<span class="text-[6px] font-bold text-red-900 block mb-0.5">${campo}</span><div class="pointer-events-none text-[5px] leading-tight">${contenidoVisual}</div>`;
            drawingOverlayModal.appendChild(cajaVisual);
        }
    }

    // Generar y descargar PDF definitivo con un clic
    btnGenerarPdfModal.addEventListener('click', async () => {
        if (!archivoPdfOriginalBytes) return alert("⚠️ No se ha cargado la plantilla PDF base.");
        if (Object.keys(coordenadasMap).length === 0) return alert("⚠️ No hay coordenadas configuradas para esta escuela.");
        const semSeleccionada = selectSemanaModal.value;
        if (!semSeleccionada) return alert("⚠️ Selecciona una semana primero.");

        try {
            estadoInfoModal.textContent = "⏳ Generando PDF final...";
            
            const pdfBytesClon = archivoPdfOriginalBytes.slice(0);
            const pdfDocLib = await PDFLib.PDFDocument.load(pdfBytesClon);
            
            const firstPage = pdfDocLib.getPages()[0];
            const { height: pdfHeight } = firstPage.getSize();
            const font = await pdfDocLib.embedFont(PDFLib.StandardFonts.Helvetica);
            const fontBold = await pdfDocLib.embedFont(PDFLib.StandardFonts.HelveticaBold);

            const datosSemana = semanasAgrupadas[semSeleccionada] || {};

            for (const [campo, box] of Object.entries(coordenadasMap)) {
                if (!box || typeof box.x1 === 'undefined' || typeof box.y1 === 'undefined') continue;

                const lowerKey = campo.toLowerCase();
                let lineasAsignadas = [];

                if (!lowerKey.includes('stunden') && !lowerKey.includes('hora') && !lowerKey.includes('zeit')) {
                    if (lowerKey.includes('montag') || lowerKey.includes('lunes')) lineasAsignadas = datosSemana.lunes || [];
                    else if (lowerKey.includes('dienstag') || lowerKey.includes('martes')) lineasAsignadas = datosSemana.dienstag || [];
                    else if (lowerKey.includes('mittwoch') || lowerKey.includes('miercoles')) lineasAsignadas = datosSemana.mittwoch || [];
                    else if (lowerKey.includes('donnerstag') || lowerKey.includes('jueves')) lineasAsignadas = datosSemana.donnerstag || [];
                    else if (lowerKey.includes('freitag') || lowerKey.includes('viernes')) lineasAsignadas = datosSemana.freitag || [];
                    else if (lowerKey.includes('schueler')) lineasAsignadas = [nombreUsuarioActual];
                }

                lineasAsignadas = lineasAsignadas.filter(l => l && l.trim() !== '');
                if (lineasAsignadas.length === 0) continue;

                const x = Number(box.x1);
                const anchoCaja = Math.max(10, Number(box.x2) - Number(box.x1));
                
                const heightCanvasPdfJs = pageViewport ? (pageViewport.height / scale) : pdfHeight;
                const y1Visual = Number(box.y1);
                const yPdfLibTop = pdfHeight - (heightCanvasPdfJs - y1Visual) - 10;

                const esEncabezado = lowerKey.includes('schueler') || lowerKey.includes('klasse') || lowerKey.includes('woche');
                const fontSize = esEncabezado ? 10.5 : 8.5;
                const fuenteUsada = esEncabezado ? fontBold : font;
                const espaciadoLineas = fontSize * 1.4;

                let lineasFinalesParaDibujar = [];
                lineasAsignadas.forEach(parrafo => {
                    const palabras = String(parrafo).trim().split(/\s+/);
                    let lineaActual = '';

                    palabras.forEach(palabra => {
                        const pruebaLinea = lineaActual ? `${lineaActual} ${palabra}` : palabra;
                        const anchoPrueba = fuenteUsada.widthOfTextAtSize(pruebaLinea, fontSize);

                        if (anchoPrueba > anchoCaja && lineaActual !== '') {
                            lineasFinalesParaDibujar.push(lineaActual);
                            lineaActual = palabra;
                        } else {
                            lineaActual = pruebaLinea;
                        }
                    });
                    if (lineaActual) {
                        lineasFinalesParaDibujar.push(lineaActual);
                    }
                });

                lineasFinalesParaDibujar.forEach((linea, index) => {
                    const yActual = yPdfLibTop - (index * espaciadoLineas);
                    try {
                        firstPage.drawText(linea, {
                            x: x,
                            y: yActual,
                            size: fontSize,
                            font: fuenteUsada,
                            color: PDFLib.rgb(0, 0, 0)
                        });
                    } catch (innerErr) {
                        console.error(`❌ Error al estampar en el campo "${campo}":`, innerErr);
                    }
                });
            }

            const pdfBytesFinales = await pdfDocLib.save();
            const blob = new Blob([pdfBytesFinales], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Ausbildungsnachweis_${nombreUsuarioActual}_${semSeleccionada}.pdf`;
            link.click();

            estadoInfoModal.textContent = "🎉 ¡PDF generado y descargado con éxito!";
        } catch (err) {
            console.error("🔥 ERROR PDF-LIB:", err);
            estadoInfoModal.textContent = "❌ Error al generar el PDF.";
            alert("Error crítico: " + err.message);
        }
    });
}
