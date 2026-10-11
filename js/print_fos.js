import { SUPABASE_URL, headers } from './config.js';

export async function inicializarVistaPreviaSemanasFos(containerId, usuarioPreseleccionado = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. Estructura HTML reducida: Panel azul integrado con selector de semana y botón de descarga
    container.innerHTML = `
        <div class="space-y-4 relative">
            <!-- PANEL DE RESUMEN DE DATOS AUTOMÁTICOS + SELECTOR DE SEMANA -->
            <div class="bg-indigo-900 text-white p-3.5 rounded-xl shadow-md space-y-3 text-xs">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-indigo-700 pb-2.5 gap-2">
                    <span class="font-bold uppercase tracking-wider text-indigo-200">👤 Datos del Reporte Activo</span>
                    
                    <!-- Selector de Semana y Botón integrados -->
                    <div class="flex items-center gap-2 w-full sm:w-auto">
                        <select id="fosSelectSemanaModal" class="p-1.5 border border-indigo-500 rounded text-xs bg-indigo-950 text-white font-medium flex-1 sm:flex-initial focus:outline-none focus:ring-1 focus:ring-emerald-400">
                            <option value="">-- Selecciona semana --</option>
                        </select>
                        <button id="btnGenerarPdfModal" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow transition whitespace-nowrap">
                            🚀 Descargar PDF
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    <div><span class="text-indigo-300 block text-[10px] uppercase">Nombre:</span><strong id="fosResNombre" class="text-white">Cargando...</strong></div>
                    <div><span class="text-indigo-300 block text-[10px] uppercase">Clase:</span><strong id="fosResClase" class="text-white">Cargando...</strong></div>
                    <div><span class="text-indigo-300 block text-[10px] uppercase">Profesión:</span><strong id="fosResProfesion" class="text-white">Cargando...</strong></div>
                    <div><span class="text-indigo-300 block text-[10px] uppercase">Lugar (Betrieb):</span><strong id="fosResWorkplace" class="text-white">Cargando...</strong></div>
                    <div><span class="text-indigo-300 block text-[10px] uppercase">Profesora:</span><strong id="fosResProfesora" class="text-white">Cargando...</strong></div>
                </div>
            </div>

            <!-- Información de estado discreta -->
            <div id="fosEstadoInfoModal" class="text-[10px] font-bold text-indigo-600 bg-indigo-50 p-2 rounded border border-indigo-200 text-center">
                📌 Sincronizando datos y preparando plantilla...
            </div>

            <!-- VENTANA EMERGENTE (MODAL) DE VERIFICACIÓN -->
            <div id="fosModalVerificacion" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 hidden">
                <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 flex flex-col max-h-[90vh]">
                    <div class="bg-indigo-900 text-white px-4 py-3 flex justify-between items-center">
                        <h3 class="text-sm font-bold uppercase tracking-wider">🔍 Verificar Datos del Ausbildungsnachweis</h3>
                        <button id="fosModalCerrarX" class="text-indigo-200 hover:text-white font-bold text-lg">&times;</button>
                    </div>
                    <div class="p-4 overflow-y-auto space-y-3 text-xs text-gray-700 flex-1">
                        <p class="text-[11px] text-gray-500">Por favor, revisa que los datos y las actividades a imprimir sean correctos antes de generar el documento final:</p>
                        
                        <div class="bg-indigo-50 p-3 rounded-lg border border-indigo-100 grid grid-cols-2 gap-2">
                            <div><span class="text-gray-500 block text-[10px] uppercase">Estudiante:</span><strong id="fosValNombre" class="text-indigo-900">-</strong></div>
                            <div><span class="text-gray-500 block text-[10px] uppercase">Clase:</span><strong id="fosValClase" class="text-indigo-900">-</strong></div>
                            <div><span class="text-gray-500 block text-[10px] uppercase">Semana:</span><strong id="fosValSemana" class="text-indigo-900">-</strong></div>
                            <div><span class="text-gray-500 block text-[10px] uppercase">Profesión:</span><strong id="fosValProfesion" class="text-indigo-900">-</strong></div>
                            <div><span class="text-gray-500 block text-[10px] uppercase">Lugar de Trabajo:</span><strong id="fosValWorkplace" class="text-indigo-900">-</strong></div>
                            <div><span class="text-gray-500 block text-[10px] uppercase">Profesora:</span><strong id="fosValProfesora" class="text-indigo-900">-</strong></div>
                        </div>

                        <div>
                            <h4 class="font-bold text-gray-800 uppercase text-[10px] mb-1">📋 Actividades Registradas para esta Semana:</h4>
                            <div id="fosValActividades" class="bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-1 text-[11px] max-h-40 overflow-y-auto">
                                <!-- Se llena dinámicamente -->
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
                        <button id="fosModalBtnCancelar" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold px-3 py-1.5 rounded text-xs transition">Cancelar</button>
                        <button id="fosModalBtnConfirmar" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded text-xs transition shadow">Confirmar y Descargar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const selectSemanaModal = document.getElementById('fosSelectSemanaModal');
    const btnGenerarPdfModal = document.getElementById('btnGenerarPdfModal');
    const estadoInfoModal = document.getElementById('fosEstadoInfoModal');

    // Referencias del Modal
    const fosModalVerificacion = document.getElementById('fosModalVerificacion');
    const fosModalCerrarX = document.getElementById('fosModalCerrarX');
    const fosModalBtnCancelar = document.getElementById('fosModalBtnCancelar');
    const fosModalBtnConfirmar = document.getElementById('fosModalBtnConfirmar');

    const fosValNombre = document.getElementById('fosValNombre');
    const fosValClase = document.getElementById('fosValClase');
    const fosValSemana = document.getElementById('fosValSemana');
    const fosValProfesion = document.getElementById('fosValProfesion');
    const fosValWorkplace = document.getElementById('fosValWorkplace');
    const fosValProfesora = document.getElementById('fosValProfesora');
    const fosValActividades = document.getElementById('fosValActividades');

    // Elementos de la tarjeta visual superior
    const fosResNombre = document.getElementById('fosResNombre');
    const fosResClase = document.getElementById('fosResClase');
    const fosResProfesion = document.getElementById('fosResProfesion');
    const fosResWorkplace = document.getElementById('fosResWorkplace');
    const fosResProfesora = document.getElementById('fosResProfesora');

    let archivoPdfOriginalBytes = null;
    let coordenadasMap = {};
    let semanasAgrupadas = {};
    
    // 🔐 Recuperación del usuario actual (sesión)
    let nombreUsuarioActual = usuarioPreseleccionado || localStorage.getItem('usuario_actual');
    if (!nombreUsuarioActual) {
        estadoInfoModal.textContent = "❌ No se encontró un usuario activo.";
        return;
    }

    fosResNombre.textContent = nombreUsuarioActual;

    // 🚀 Sincronización optimizada con Supabase y carga automática del PDF desde la carpeta form
    try {
        estadoInfoModal.textContent = "⏳ Sincronizando datos y cargando plantilla...";

        const [respUsuario, respReg] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/usuarios?nombre=eq.${encodeURIComponent(nombreUsuarioActual)}&select=*`, { 
                headers: { ...headers, 'Range': '0-0' } 
            }),
            fetch(`${SUPABASE_URL}/rest/v1/registro_diario?usuario=eq.${encodeURIComponent(nombreUsuarioActual)}&select=*`, { 
                headers: { ...headers, 'Range': '0-999' } 
            })
        ]);
        
        if (!respUsuario.ok) throw new Error("Error al consultar el perfil.");
        const dataUsr = await respUsuario.json();
        if (dataUsr.length === 0) throw new Error("Usuario no encontrado.");

        const usuario = dataUsr[0];
        const escuelaSeleccionadaId = usuario.file_identifier || usuario.school_name || usuario.escuela || 'Berufliche Oberschule Holzkirchen';
        const claseUsuario = usuario.class || usuario.klasse || usuario.clase || '-';
        const workplaceUsuario = usuario.workplace || usuario.betrieb || usuario.ausbildungsstaette || '-';
        const profesoraUsuario = usuario.teacher || '-'; 
        const codigoProfesion = usuario.ausbildung;

        const [respProf, respTpl] = await Promise.all([
            codigoProfesion 
                ? fetch(`${SUPABASE_URL}/rest/v1/profesions?codigo=eq.${encodeURIComponent(codigoProfesion)}&select=*`, { headers: { ...headers, 'Range': '0-0' } })
                : Promise.resolve(null),
            fetch(`${SUPABASE_URL}/rest/v1/school_templates?file_identifier=eq.${encodeURIComponent(escuelaSeleccionadaId)}&select=*`, { headers: { ...headers, 'Range': '0-0' } })
        ]);

        let profesionUsuario = codigoProfesion || '-';
        if (respProf && respProf.ok) {
            const dataProf = await respProf.json();
            if (dataProf.length > 0) {
                profesionUsuario = dataProf[0].nombre_oficial || dataProf[0].codigo || codigoProfesion;
            }
        }

        if (respTpl && respTpl.ok) {
            const tplData = await respTpl.json();
            if (tplData.length > 0) {
                coordenadasMap = tplData[0].coordinates_json || {};
            }
        }

        // Respaldo de coordenadas si están vacías
        if (Object.keys(coordenadasMap).length === 0) {
            const respFallbackTpl = await fetch(`${SUPABASE_URL}/rest/v1/school_templates?select=*`, { 
                headers: { ...headers, 'Range': '0-0' } 
            });
            if (respFallbackTpl.ok) {
                const fallbackData = await respFallbackTpl.json();
                if (fallbackData.length > 0) {
                    coordenadasMap = fallbackData[0].coordinates_json || {};
                }
            }
        }

        // Obtener la clave de la semana actual (Lunes a Viernes) para preseleccionar
        const hoy = new Date();
        const diaSemanaHoy = hoy.getDay();
        const diffHoy = hoy.getDate() - diaSemanaHoy + (diaSemanaHoy === 0 ? -6 : 1);
        const lunesActualObj = new Date(new Date(hoy).setDate(diffHoy));
        const viernesActualObj = new Date(lunesActualObj);
        viernesActualObj.setDate(lunesActualObj.getDate() + 4);
        const claveSemanaActual = `${lunesActualObj.toLocaleDateString('de-DE')} bis ${viernesActualObj.toLocaleDateString('de-DE')}`;

        if (respReg.ok) {
            const registrosGlobales = await respReg.json();
            semanasAgrupadas = agruparRegistrosPorSemana(registrosGlobales);

            selectSemanaModal.innerHTML = '<option value="">-- Selecciona una semana --</option>';

            Object.keys(semanasAgrupadas).forEach(sem => {
                const opt = document.createElement('option');
                opt.value = sem;
                opt.textContent = `Woche: ${sem}`;
                
                if (sem === claveSemanaActual) {
                    opt.selected = true;
                }
                selectSemanaModal.appendChild(opt);
            });
        }

        // Pintar datos en el panel
        fosResClase.textContent = claseUsuario;
        fosResProfesion.textContent = profesionUsuario;
        fosResWorkplace.textContent = workplaceUsuario;
        fosResProfesora.textContent = profesoraUsuario;

        // 📥 Carga automática del PDF desde la carpeta 'form' del repositorio
        const nombreArchivoPdf = `${escuelaSeleccionadaId}.pdf`;
        const rutaPdfRepositorio = `./form/${encodeURIComponent(nombreArchivoPdf)}`;

        try {
            const respuestaPdf = await fetch(rutaPdfRepositorio);
            if (!respuestaPdf.ok) throw new Error(`No se encontró el archivo en la ruta: ${rutaPdfRepositorio}`);
            
            archivoPdfOriginalBytes = await respuestaPdf.arrayBuffer();
            estadoInfoModal.textContent = "✅ Listo para generar reportes. Semana actual seleccionada automáticamente.";
        } catch (errorPdfRepo) {
            console.error("Error al cargar la plantilla automática:", errorPdfRepo);
            estadoInfoModal.textContent = "⚠️ No se encontró la plantilla PDF en la carpeta 'form'.";
        }

    } catch (err) {
        console.error("Error sincronizando con Supabase:", err);
        estadoInfoModal.textContent = `❌ ${err.message || "Error al conectar con Supabase."}`;
    }

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

    btnGenerarPdfModal.addEventListener('click', () => {
        if (!archivoPdfOriginalBytes) return alert("⚠️ La plantilla PDF base aún no se ha cargado del repositorio.");
        if (Object.keys(coordenadasMap).length === 0) return alert("⚠️ No hay coordenadas cargadas desde Supabase.");
        const semSeleccionada = selectSemanaModal.value;
        if (!semSeleccionada) return alert("⚠️ Por favor, selecciona una semana.");

        fosValNombre.textContent = nombreUsuarioActual;
        fosValClase.textContent = fosResClase.textContent;
        fosValSemana.textContent = semSeleccionada;
        fosValProfesion.textContent = fosResProfesion.textContent;
        fosValWorkplace.textContent = fosResWorkplace.textContent;
        fosValProfesora.textContent = fosResProfesora.textContent;

        const datosSemana = semanasAgrupadas[semSeleccionada] || {};
        const dias = [
            { nombre: 'Montag (Lunes)', items: datosSemana.lunes },
            { nombre: 'Dienstag (Martes)', items: datosSemana.dienstag },
            { nombre: 'Mittwoch (Miércoles)', items: datosSemana.mittwoch },
            { nombre: 'Donnerstag (Jueves)', items: datosSemana.donnerstag },
            { nombre: 'Freitag (Viernes)', items: datosSemana.freitag }
        ];

        let htmlActividades = '';
        dias.forEach(dia => {
            const listado = (dia.items || []).filter(i => i && i.trim() !== '');
            htmlActividades += `
                <div>
                    <span class="font-semibold text-indigo-900">${dia.nombre}:</span>
                    <span class="text-gray-600">${listado.length > 0 ? listado.join(' | ') : '<span class="italic text-gray-400">Sin actividades</span>'}</span>
                </div>
            `;
        });
        fosValActividades.innerHTML = htmlActividades;
        fosModalVerificacion.classList.remove('hidden');
    });

    const cerrarModal = () => fosModalVerificacion.classList.add('hidden');
    fosModalCerrarX.addEventListener('click', cerrarModal);
    fosModalBtnCancelar.addEventListener('click', cerrarModal);

    fosModalBtnConfirmar.addEventListener('click', async () => {
        cerrarModal();
        const semSeleccionada = selectSemanaModal.value;

        try {
            estadoInfoModal.textContent = "⏳ Generando PDF final...";
            
            const pdfBytesClon = archivoPdfOriginalBytes.slice(0);
            const pdfDocLib = await PDFLib.PDFDocument.load(pdfBytesClon);
            
            const firstPage = pdfDocLib.getPages()[0];
            const { height: pdfHeight } = firstPage.getSize();
            const font = await pdfDocLib.embedFont(PDFLib.StandardFonts.Helvetica);

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
                    else if (lowerKey.includes('klasse') || lowerKey.includes('class')) lineasAsignadas = [fosResClase.textContent];
                    else if (lowerKey.includes('ausbildungsrichtung') || lowerKey.includes('fachrichtung') || (lowerKey.includes('ausbildung') && !lowerKey.includes('staette') && !lowerKey.includes('betrieb')) || lowerKey.includes('beruf') || lowerKey.includes('profesion')) lineasAsignadas = [fosResProfesion.textContent];
                    else if (lowerKey.includes('workplace') || lowerKey.includes('betrieb') || lowerKey.includes('ausbildungsstaette') || lowerKey.includes('lugar')) lineasAsignadas = [fosResWorkplace.textContent];
                    else if (lowerKey.includes('lehrkraft') || lowerKey.includes('lehrer') || lowerKey.includes('teacher') || lowerKey.includes('profesor')) lineasAsignadas = [fosResProfesora.textContent];
                    else if (lowerKey.includes('woche') || lowerKey.includes('semana') || lowerKey.includes('lapso')) lineasAsignadas = [semSeleccionada];
                }

                lineasAsignadas = lineasAsignadas.filter(l => l && l.trim() !== '');
                if (lineasAsignadas.length === 0) continue;

                const x = Number(box.x1);
                const anchoCaja = Math.max(10, Number(box.x2) - Number(box.x1));
                
                // 🔄 INVERSIÓN CORRECTA DEL EJE Y: Convertimos el origen superior-izquierdo a inferior-izquierdo de PDF-Lib
                const y1Visual = Number(box.y1);
                const yPdfLibTop = pdfHeight - y1Visual;

                const esEncabezado = lowerKey.includes('schueler') || lowerKey.includes('klasse') || lowerKey.includes('class') || lowerKey.includes('woche') || lowerKey.includes('lehrer') || lowerKey.includes('lehrkraft') || lowerKey.includes('teacher') || lowerKey.includes('ausbildung') || lowerKey.includes('ausbildungsrichtung') || lowerKey.includes('beruf') || lowerKey.includes('workplace') || lowerKey.includes('betrieb') || lowerKey.includes('ausbildungsstaette') || lowerKey.includes('lapso');
                const fontSize = esEncabezado ? 10.5 : 8.5;
                const fuenteUsada = font;
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
            link.download = `Taetigkeitsnachweis_${nombreUsuarioActual}_${semSeleccionada}.pdf`;
            link.click();

            estadoInfoModal.textContent = "🎉 ¡PDF generado y descargado con éxito!";
        } catch (err) {
            console.error("🔥 ERROR PDF-LIB:", err);
            estadoInfoModal.textContent = "❌ Error al generar el PDF.";
            alert("Error crítico: " + err.message);
        }
    });
}
