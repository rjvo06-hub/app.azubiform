import { SUPABASE_URL, headers } from './config.js';

export async function inicializarVistaPreviaSemanasFos(containerId, usuarioPreseleccionado = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-4">
            <!-- PANEL DE RESUMEN DE DATOS AUTOMÁTICOS -->
            <div class="bg-indigo-900 text-white p-3 rounded-xl shadow-md space-y-2 text-xs">
                <div class="flex justify-between items-center border-b border-indigo-700 pb-1.5">
                    <span class="font-bold uppercase tracking-wider text-indigo-200">👤 Datos del Reporte Activo</span>
                    <span id="fosLblSemanaActual" class="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[11px]">Semana: No seleccionada</span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    <div><span class="text-indigo-300 block text-[10px] uppercase">Nombre:</span><strong id="fosResNombre" class="text-white">Cargando...</strong></div>
                    <div><span class="text-indigo-300 block text-[10px] uppercase">Clase:</span><strong id="fosResClase" class="text-white">Cargando...</strong></div>
                    <div><span class="text-indigo-300 block text-[10px] uppercase">Profesión:</span><strong id="fosResProfesion" class="text-white">Cargando...</strong></div>
                    <div><span class="text-indigo-300 block text-[10px] uppercase">Lugar (Betrieb):</span><strong id="fosResWorkplace" class="text-white">Cargando...</strong></div>
                    <div><span class="text-indigo-300 block text-[10px] uppercase">Profesora:</span><strong id="fosResProfesora" class="text-white">Cargando...</strong></div>
                </div>
            </div>

            <!-- 1. Carga manual del PDF base -->
            <div class="bg-amber-50 p-3 rounded-lg border border-amber-200 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div>
                    <h3 class="text-xs font-bold text-amber-900 uppercase">📂 1. Cargar Plantilla PDF Base</h3>
                    <p class="text-[10px] text-amber-700">Selecciona el archivo PDF original de la escuela.</p>
                </div>
                <div class="w-full sm:w-auto">
                    <input type="file" id="fosPdfFileInput" accept="application/pdf" class="text-[11px] text-gray-500 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-amber-100 file:text-amber-800 w-full cursor-pointer">
                </div>
            </div>

            <!-- 2. Selección de Semana y Descarga -->
            <div class="bg-indigo-50 p-3 rounded-lg border border-indigo-200 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div>
                    <h3 class="text-xs font-bold text-indigo-900 uppercase">⚡ 2. Generar Ausbildungsnachweis</h3>
                    <p class="text-[10px] text-indigo-700">Selecciona la semana para estampar toda la información.</p>
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

            <!-- Visor / Canvas -->
            <div class="bg-gray-900 rounded-xl p-2 flex justify-center overflow-auto max-h-[45vh] relative border border-gray-300">
                <div class="relative inline-block shadow-2xl" id="fosCanvasContainerModal">
                    <canvas id="fosPdfCanvasModal" class="block"></canvas>
                    <div id="fosDrawingOverlayModal" class="absolute inset-0 pointer-events-none"></div>
                </div>
            </div>
            <div id="fosEstadoInfoModal" class="text-[10px] font-bold text-indigo-600 bg-indigo-50 p-2 rounded border border-indigo-200 text-center">
                📌 Datos cargados correctamente. Sube el PDF base para comenzar.
            </div>
        </div>
    `;

    const fosPdfFileInput = document.getElementById('fosPdfFileInput');
    const selectSemanaModal = document.getElementById('fosSelectSemanaModal');
    const btnGenerarPdfModal = document.getElementById('btnGenerarPdfModal');
    const estadoInfoModal = document.getElementById('fosEstadoInfoModal');
    const canvasModal = document.getElementById('fosPdfCanvasModal');
    const drawingOverlayModal = document.getElementById('fosDrawingOverlayModal');

    // Elementos de la tarjeta visual superior
    const fosResNombre = document.getElementById('fosResNombre');
    const fosResClase = document.getElementById('fosResClase');
    const fosResProfesion = document.getElementById('fosResProfesion');
    const fosResWorkplace = document.getElementById('fosResWorkplace');
    const fosResProfesora = document.getElementById('fosResProfesora');
    const fosLblSemanaActual = document.getElementById('fosLblSemanaActual');

    let pdfDoc = null;
    let pageViewport = null;
    let scale = 1.0;
    let archivoPdfOriginalBytes = null;
    let coordenadasMap = {};
    let semanasAgrupadas = {};
    let registrosGlobales = [];
    let escuelaSeleccionadaId = null;
    let nombreUsuarioActual = usuarioPreseleccionado || localStorage.getItem('usuario_actual');
    
    // Variables de perfil
    let claseUsuario = '-';
    let profesionUsuario = '-';
    let workplaceUsuario = '-';
    let profesoraUsuario = localStorage.getItem('usuario_teacher') || localStorage.getItem('usuario_profesora') || '-';

    if (!nombreUsuarioActual) {
        estadoInfoModal.textContent = "❌ No se encontró un usuario activo.";
        return;
    }

    fosResNombre.textContent = nombreUsuarioActual;

    // 1. Consultar datos en Supabase
    try {
        const respUsuario = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?nombre=eq.${encodeURIComponent(nombreUsuarioActual)}&select=*`, {
            headers: { ...headers, 'Range': '0-999' }
        });
        
        if (respUsuario.ok) {
            const dataUsr = await respUsuario.json();
            if (dataUsr.length > 0) {
                const usuario = dataUsr[0];
                console.log("📦 Datos completos del usuario en Supabase:", usuario);

                escuelaSeleccionadaId = usuario.file_identifier || usuario.escuela || '';
                
                claseUsuario = usuario.class || usuario.klasse || usuario.clase || '-';
                workplaceUsuario = usuario.workplace || usuario.betrieb || usuario.ausbildungsstaette || '-';
                
                if (usuario.teacher) {
                    profesoraUsuario = usuario.teacher;
                }
                
                const codigoProfesion = usuario.ausbildung;
                if (codigoProfesion) {
                    const respProf = await fetch(`${SUPABASE_URL}/rest/v1/profesions?codigo=eq.${encodeURIComponent(codigoProfesion)}&select=*`, {
                        headers: { ...headers, 'Range': '0-9' }
                    });
                    if (respProf.ok) {
                        const dataProf = await respProf.json();
                        if (dataProf.length > 0) {
                            profesionUsuario = dataProf[0].nombre_oficial || dataProf[0].codigo || codigoProfesion;
                        } else {
                            profesionUsuario = codigoProfesion;
                        }
                    }
                }
            }
        }

        // Actualizar la tarjeta visual superior
        fosResClase.textContent = claseUsuario;
        fosResProfesion.textContent = profesionUsuario;
        fosResWorkplace.textContent = workplaceUsuario;
        fosResProfesora.textContent = profesoraUsuario;

        if (!escuelaSeleccionadaId) {
            const respTemplates = await fetch(`${SUPABASE_URL}/rest/v1/school_templates?select=file_identifier`, {
                headers: { ...headers, 'Range': '0-9' }
            });
            if (respTemplates.ok) {
                const templates = await respTemplates.json();
                if (templates.length > 0) escuelaSeleccionadaId = templates[0].file_identifier;
            }
        }

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

        // Cargar registros diarios del usuario
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
        }

    } catch (err) {
        console.error("Error cargando datos de Supabase:", err);
        estadoInfoModal.textContent = "❌ Error al conectar con Supabase.";
    }

    fosPdfFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            archivoPdfOriginalBytes = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: archivoPdfOriginalBytes.slice(0) });
            pdfDoc = await loadingTask.promise;
            await renderizarPaginaModal(1);
            estadoInfoModal.textContent = "✅ PDF base cargado. Selecciona la semana para visualizar.";
        } catch (err) {
            console.error(err);
            estadoInfoModal.textContent = "❌ Error al procesar el archivo PDF.";
        }
    });

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

    selectSemanaModal.addEventListener('change', (e) => {
        const semSeleccionada = e.target.value;
        fosLblSemanaActual.textContent = semSeleccionada ? `Semana: ${semSeleccionada}` : "Semana: No seleccionada";
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

            const claveSemana = `${lunes.toLocaleDateString('de-DE')} bis ${viernes.toLocaleDateString('de-DE')}`;

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
                else if (lowerKey.includes('schueler') || lowerKey.includes('name')) textoAsignado = nombreUsuarioActual;
                else if (lowerKey.includes('klasse') || lowerKey.includes('class')) textoAsignado = claseUsuario;
                else if (lowerKey.includes('ausbildung') || lowerKey.includes('beruf') || lowerKey.includes('fachrichtung') || lowerKey.includes('profesion')) textoAsignado = profesionUsuario;
                else if (lowerKey.includes('workplace') || lowerKey.includes('betrieb') || lowerKey.includes('ausbildungsstaette') || lowerKey.includes('lugar')) textoAsignado = workplaceUsuario;
                else if (lowerKey.includes('lehrer') || lowerKey.includes('teacher') || lowerKey.includes('profesor')) textoAsignado = profesoraUsuario;
                else if (lowerKey.includes('woche') || lowerKey.includes('semana') || lowerKey.includes('lapso')) textoAsignado = semSeleccionada;
            }

            const contenidoVisual = textoAsignado ? textoAsignado : `<span class="text-gray-400 italic">[${campo}]</span>`;
            cajaVisual.innerHTML = `<span class="text-[6px] font-bold text-red-900 block mb-0.5">${campo}</span><div class="pointer-events-none text-[5px] leading-tight">${contenidoVisual}</div>`;
            drawingOverlayModal.appendChild(cajaVisual);
        }
    }

    // Generar y descargar PDF definitivo
    btnGenerarPdfModal.addEventListener('click', async () => {
        if (!archivoPdfOriginalBytes) return alert("⚠️ Sube primero el archivo PDF base.");
        if (Object.keys(coordenadasMap).length === 0) return alert("⚠️ No hay coordenadas cargadas desde Supabase.");
        const semSeleccionada = selectSemanaModal.value;
        if (!semSeleccionada) return alert("⚠️ Selecciona una semana.");

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
                    else if (lowerKey.includes('schueler') || lowerKey.includes('name')) lineasAsignadas = [nombreUsuarioActual];
                    else if (lowerKey.includes('klasse') || lowerKey.includes('class')) lineasAsignadas = [claseUsuario];
                    else if (lowerKey.includes('ausbildung') || lowerKey.includes('beruf') || lowerKey.includes('fachrichtung') || lowerKey.includes('profesion')) lineasAsignadas = [profesionUsuario];
                    else if (lowerKey.includes('workplace') || lowerKey.includes('betrieb') || lowerKey.includes('ausbildungsstaette') || lowerKey.includes('lugar')) lineasAsignadas = [workplaceUsuario];
                    else if (lowerKey.includes('lehrer') || lowerKey.includes('teacher') || lowerKey.includes('profesor')) lineasAsignadas = [profesoraUsuario];
                    else if (lowerKey.includes('woche') || lowerKey.includes('semana') || lowerKey.includes('lapso')) lineasAsignadas = [semSeleccionada];
                }

                lineasAsignadas = lineasAsignadas.filter(l => l && l.trim() !== '');
                if (lineasAsignadas.length === 0) continue;

                const x = Number(box.x1);
                const anchoCaja = Math.max(10, Number(box.x2) - Number(box.x1));
                
                const heightCanvasPdfJs = pageViewport ? (pageViewport.height / scale) : pdfHeight;
                const y1Visual = Number(box.y1);
                const yPdfLibTop = pdfHeight - (heightCanvasPdfJs - y1Visual) - 10;

                const esEncabezado = lowerKey.includes('schueler') || lowerKey.includes('klasse') || lowerKey.includes('class') || lowerKey.includes('woche') || lowerKey.includes('lehrer') || lowerKey.includes('teacher') || lowerKey.includes('ausbildung') || lowerKey.includes('beruf') || lowerKey.includes('workplace') || lowerKey.includes('betrieb') || lowerKey.includes('lapso');
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
