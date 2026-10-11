import { SUPABASE_URL, headers } from './config.js';

export async function inicializarVistaPreviaSemanasFos(containerId, usuarioPreseleccionado = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Estructura adaptada y completamente en alemán
    container.innerHTML = `
        <div class="space-y-4 relative">
            <!-- PANEL DE RESUMEN E INTEGRACIÓN DE SEMANA -->
            <div class="bg-indigo-900 text-white p-3.5 rounded-xl shadow-md space-y-3 text-xs">
                <div class="border-b border-indigo-700 pb-2 space-y-2">
                    <span class="font-bold uppercase tracking-wider text-indigo-200 block">👤 Aktive Berichtsdaten</span>
                    
                    <!-- Selector de Semana y Botón optimizados para móviles -->
                    <div class="flex flex-col gap-2 w-full pt-1">
                        <select id="fosSelectSemanaModal" class="w-full p-2 border border-indigo-500 rounded text-xs bg-indigo-950 text-white font-medium">
                            <option value="">-- Woche auswählen --</option>
                        </select>
                        <button id="btnGenerarPdfModal" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded shadow transition flex items-center justify-center gap-1">
                            <span>🚀 PDF herunterladen</span>
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    <div><span class="text-indigo-300 block text-[10px] uppercase">Name:</span><strong id="fosResNombre" class="text-white">Wird geladen...</strong></div>
                    <div><span class="text-indigo-300 block text-[10px] uppercase">Klasse:</span><strong id="fosResClase" class="text-white">Wird geladen...</strong></div>
                    <div><span class="text-indigo-300 block text-[10px] uppercase">Ausbildung:</span><strong id="fosResProfesion" class="text-white">Wird geladen...</strong></div>
                    <div><span class="text-indigo-300 block text-[10px] uppercase">Betrieb:</span><strong id="fosResWorkplace" class="text-white">Wird geladen...</strong></div>
                    <div><span class="text-indigo-300 block text-[10px] uppercase">Lehrkraft:</span><strong id="fosResProfesora" class="text-white">Wird geladen...</strong></div>
                </div>
            </div>

            <div id="fosEstadoInfoModal" class="text-[10px] font-bold text-indigo-600 bg-indigo-50 p-2 rounded border border-indigo-200 text-center">
                📌 Daten werden synchronisiert und Vorlage wird geladen...
            </div>

            <!-- VENTANA EMERGENTE (MODAL) DE VERIFICACIÓN -->
            <div id="fosModalVerificacion" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 hidden">
                <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 flex flex-col max-h-[90vh]">
                    <div class="bg-indigo-900 text-white px-4 py-3 flex justify-between items-center">
                        <h3 class="text-sm font-bold uppercase tracking-wider">🔍 Ausbildungsnachweis überprüfen</h3>
                        <button id="fosModalCerrarX" class="text-indigo-200 hover:text-white font-bold text-lg">&times;</button>
                    </div>
                    <div class="p-4 overflow-y-auto space-y-3 text-xs text-gray-700 flex-1">
                        <p class="text-[11px] text-gray-500">Bitte überprüfen Sie, ob die Daten und Aktivitäten korrekt sind, bevor Sie das finale Dokument generieren:</p>
                        
                        <div class="bg-indigo-50 p-3 rounded-lg border border-indigo-100 grid grid-cols-2 gap-2">
                            <div><span class="text-gray-500 block text-[10px] uppercase">Schüler/in:</span><strong id="fosValNombre" class="text-indigo-900">-</strong></div>
                            <div><span class="text-gray-500 block text-[10px] uppercase">Klasse:</span><strong id="fosValClase" class="text-indigo-900">-</strong></div>
                            <div><span class="text-gray-500 block text-[10px] uppercase">Woche:</span><strong id="fosValSemana" class="text-indigo-900">-</strong></div>
                            <div><span class="text-gray-500 block text-[10px] uppercase">Ausbildung:</span><strong id="fosValProfesion" class="text-indigo-900">-</strong></div>
                            <div><span class="text-gray-500 block text-[10px] uppercase">Betrieb:</span><strong id="fosValWorkplace" class="text-indigo-900">-</strong></div>
                            <div><span class="text-gray-500 block text-[10px] uppercase">Lehrkraft:</span><strong id="fosValProfesora" class="text-indigo-900">-</strong></div>
                        </div>

                        <div>
                            <h4 class="font-bold text-gray-800 uppercase text-[10px] mb-1">📋 Erfasste Aktivitäten für diese Woche:</h4>
                            <div id="fosValActividades" class="bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-1 text-[11px] max-h-40 overflow-y-auto">
                                <!-- Se llena dinámicamente -->
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
                        <button id="fosModalBtnCancelar" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold px-3 py-1.5 rounded text-xs transition">Abbrechen</button>
                        <button id="fosModalBtnConfirmar" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded text-xs transition shadow">Bestätigen & Herunterladen</button>
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
    let coordenadasPdfMap = {}; 
    let semanasAgrupadas = {};
    
    let nombreUsuarioActual = usuarioPreseleccionado || localStorage.getItem('usuario_actual');
    if (!nombreUsuarioActual) {
        estadoInfoModal.textContent = "❌ Kein aktiver Benutzer gefunden.";
        return;
    }

    fosResNombre.textContent = nombreUsuarioActual;

    try {
        estadoInfoModal.textContent = "⏳ Vorlage wird geladen und Daten werden synchronisiert...";

        // 1. Carga automática del PDF desde la carpeta 'form' del repositorio
        const rutaPdfRepositorio = './form/Berufliche Oberschule Holzkirchen.pdf';
        const responsePdf = await fetch(rutaPdfRepositorio);
        if (!responsePdf.ok) throw new Error("Die PDF-Datei konnte nicht aus dem Ordner 'form' geladen werden.");
        archivoPdfOriginalBytes = await responsePdf.arrayBuffer();

        // 2. Consultar usuario y registros diarios en paralelo
        const [respUsuario, respReg] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/usuarios?nombre=eq.${encodeURIComponent(nombreUsuarioActual)}&select=*`, { 
                headers: { ...headers, 'Range': '0-0' } 
            }),
            fetch(`${SUPABASE_URL}/rest/v1/registro_diario?usuario=eq.${encodeURIComponent(nombreUsuarioActual)}&select=*`, { 
                headers: { ...headers, 'Range': '0-999' } 
            })
        ]);
        
        if (!respUsuario.ok) throw new Error("Fehler beim Abrufen des Profils.");
        const dataUsr = await respUsuario.json();
        if (dataUsr.length === 0) throw new Error("Benutzer nicht gefunden.");

        const usuario = dataUsr[0];
        const escuelaSeleccionadaId = usuario.file_identifier || usuario.school_name || usuario.escuela || 'fos_holzkirchen';
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
                coordenadasPdfMap = tplData[0].coordinates_pdf_json || {};
            }
        }

        if (Object.keys(coordenadasPdfMap).length === 0) {
            const respFallbackTpl = await fetch(`${SUPABASE_URL}/rest/v1/school_templates?select=*`, { 
                headers: { ...headers, 'Range': '0-0' } 
            });
            if (respFallbackTpl.ok) {
                const fallbackData = await respFallbackTpl.json();
                if (fallbackData.length > 0) {
                    coordenadasPdfMap = fallbackData[0].coordinates_pdf_json || fallbackData[0].coordinates_json || {};
                }
            }
        }

        if (respReg.ok) {
            const registrosGlobales = await respReg.json();
            semanasAgrupadas = agruparRegistrosPorSemana(registrosGlobales);

            selectSemanaModal.innerHTML = '<option value="">-- Woche auswählen --</option>';
            
            let claveSemanaActual = '';
            const hoy = new Date();

            Object.keys(semanasAgrupadas).forEach(sem => {
                const opt = document.createElement('option');
                opt.value = sem;
                opt.textContent = `Woche: ${sem}`;
                selectSemanaModal.appendChild(opt);

                // Detección automática de la semana actual
                const partes = sem.split(' bis ');
                if (partes.length === 2) {
                    const [diaL, mesL, anioL] = partes[0].split('.').map(Number);
                    const [diaV, mesV, anioV] = partes[1].split('.').map(Number);
                    const inicioSemana = new Date(anioL, mesL - 1, diaL);
                    const finSemana = new Date(anioV, mesV - 1, diaV);
                    finSemana.setHours(23, 59, 59);

                    if (hoy >= inicioSemana && hoy <= finSemana) {
                        claveSemanaActual = sem;
                    }
                }
            });

            // Seleccionar por defecto la semana actual si existe
            if (claveSemanaActual) {
                selectSemanaModal.value = claveSemanaActual;
            }
        }

        fosResClase.textContent = claseUsuario;
        fosResProfesion.textContent = profesionUsuario;
        fosResWorkplace.textContent = workplaceUsuario;
        fosResProfesora.textContent = profesoraUsuario;

        estadoInfoModal.textContent = "✅ Vorlage geladen. Bereit zur PDF-Generierung.";

    } catch (err) {
        console.error("Fehler bei der Initialisierung:", err);
        estadoInfoModal.textContent = `❌ ${err.message || "Fehler beim Laden der Komponente."}`;
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
                semanas[claveSemana] = { 
                    lunes: [], dienstag: [], mittwoch: [], donnerstag: [], freitag: [],
                    horasLunes: 0, horasDienstag: 0, horasMittwoch: 0, horasDonnerstag: 0, horasFreitag: 0
                };
            }

            const d = new Date(reg.fecha).getDay();
            const texto = reg.nombre_actividad || '';
            const horasReg = Number(reg.horas) || 0;

            if (d === 1) {
                semanas[claveSemana].lunes.push(texto);
                semanas[claveSemana].horasLunes += horasReg;
            } else if (d === 2) {
                semanas[claveSemana].dienstag.push(texto);
                semanas[claveSemana].horasDienstag += horasReg;
            } else if (d === 3) {
                semanas[claveSemana].mittwoch.push(texto);
                semanas[claveSemana].horasMittwoch += horasReg;
            } else if (d === 4) {
                semanas[claveSemana].donnerstag.push(texto);
                semanas[claveSemana].horasDonnerstag += horasReg;
            } else if (d === 5) {
                semanas[claveSemana].freitag.push(texto);
                semanas[claveSemana].horasFreitag += horasReg;
            }
        });
        return semanas;
    }

    btnGenerarPdfModal.addEventListener('click', () => {
        if (!archivoPdfOriginalBytes) return alert("⚠️ Die PDF-Vorlage wurde noch nicht geladen.");
        if (Object.keys(coordenadasPdfMap).length === 0) return alert("⚠️ Keine Koordinaten aus Supabase geladen.");
        const semSeleccionada = selectSemanaModal.value;
        if (!semSeleccionada) return alert("⚠️ Bitte wählen Sie eine gültige Woche aus.");

        fosValNombre.textContent = nombreUsuarioActual;
        fosValClase.textContent = fosResClase.textContent;
        fosValSemana.textContent = semSeleccionada;
        fosValProfesion.textContent = fosResProfesion.textContent;
        fosValWorkplace.textContent = fosResWorkplace.textContent;
        fosValProfesora.textContent = fosResProfesora.textContent;

        const datosSemana = semanasAgrupadas[semSeleccionada] || {};
        const dias = [
            { nombre: 'Montag', items: datosSemana.lunes, horas: datosSemana.horasLunes },
            { nombre: 'Dienstag', items: datosSemana.dienstag, horas: datosSemana.horasDienstag },
            { nombre: 'Mittwoch', items: datosSemana.mittwoch, horas: datosSemana.horasMittwoch },
            { nombre: 'Donnerstag', items: datosSemana.donnerstag, horas: datosSemana.horasDonnerstag },
            { nombre: 'Freitag', items: datosSemana.freitag, horas: datosSemana.horasFreitag }
        ];

        let htmlActividades = '';
        dias.forEach(dia => {
            const listado = (dia.items || []).filter(i => i && i.trim() !== '');
            htmlActividades += `
                <div>
                    <span class="font-semibold text-indigo-900">${dia.nombre} (${dia.horas} Std.):</span>
                    <span class="text-gray-600">${listado.length > 0 ? listado.join(' | ') : '<span class="italic text-gray-400">Keine Aktivitäten</span>'}</span>
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
            estadoInfoModal.textContent = "⏳ PDF wird generiert...";
            
            const pdfBytesClon = archivoPdfOriginalBytes.slice(0);
            const pdfDocLib = await PDFLib.PDFDocument.load(pdfBytesClon);
            
            const firstPage = pdfDocLib.getPages()[0];
            const font = await pdfDocLib.embedFont(PDFLib.StandardFonts.Helvetica);

            const datosSemana = semanasAgrupadas[semSeleccionada] || {};

            for (const [campo, box] of Object.entries(coordenadasPdfMap)) {
                if (!box || typeof box.x1 === 'undefined' || typeof box.y1 === 'undefined') continue;

                const lowerKey = campo.toLowerCase();
                let lineasAsignadas = [];

                const esHora = lowerKey.includes('stunden') || lowerKey.includes('hora') || lowerKey.includes('zeit');

                if (lowerKey.includes('montag') || lowerKey.includes('lunes')) {
                    lineasAsignadas = esHora ? [String(datosSemana.horasLunes || '')] : (datosSemana.lunes || []);
                } 
                else if (lowerKey.includes('dienstag') || lowerKey.includes('martes')) {
                    lineasAsignadas = esHora ? [String(datosSemana.horasDienstag || '')] : (datosSemana.dienstag || []);
                } 
                else if (lowerKey.includes('mittwoch') || lowerKey.includes('miercoles')) {
                    lineasAsignadas = esHora ? [String(datosSemana.horasMittwoch || '')] : (datosSemana.mittwoch || []);
                } 
                else if (lowerKey.includes('donnerstag') || lowerKey.includes('jueves')) {
                    lineasAsignadas = esHora ? [String(datosSemana.horasDonnerstag || '')] : (datosSemana.donnerstag || []);
                } 
                else if (lowerKey.includes('freitag') || lowerKey.includes('viernes')) {
                    lineasAsignadas = esHora ? [String(datosSemana.horasFreitag || '')] : (datosSemana.freitag || []);
                } 
                else if (lowerKey.includes('schueler') || lowerKey.includes('name')) {
                    lineasAsignadas = [nombreUsuarioActual];
                } 
                else if (lowerKey.includes('klasse') || lowerKey.includes('class')) {
                    lineasAsignadas = [fosResClase.textContent];
                } 
                else if (lowerKey.includes('ausbildungsrichtung') || lowerKey.includes('fachrichtung') || (lowerKey.includes('ausbildung') && !lowerKey.includes('staette') && !lowerKey.includes('betrieb')) || lowerKey.includes('beruf') || lowerKey.includes('profesion')) {
                    lineasAsignadas = [fosResProfesion.textContent];
                } 
                else if (lowerKey.includes('workplace') || lowerKey.includes('betrieb') || lowerKey.includes('ausbildungsstaette') || lowerKey.includes('lugar')) {
                    lineasAsignadas = [fosResWorkplace.textContent];
                } 
                else if (lowerKey.includes('lehrkraft') || lowerKey.includes('lehrer') || lowerKey.includes('teacher') || lowerKey.includes('profesor')) {
                    lineasAsignadas = [fosResProfesora.textContent];
                } 
                else if (lowerKey.includes('woche') || lowerKey.includes('semana') || lowerKey.includes('lapso')) {
                    // AQUÍ ESTÁ EL CAMBIO: Ya no ponemos el rango de fechas, sino la suma total de las horas de la semana
                    const totalSemana = (datosSemana.horasLunes || 0) + (datosSemana.horasDienstag || 0) + (datosSemana.horasMittwoch || 0) + (datosSemana.horasDonnerstag || 0) + (datosSemana.horasFreitag || 0);
                    lineasAsignadas = [totalSemana > 0 ? String(totalSemana) : ''];
                } 
                else if (esHora) {
                    const totalSemana = (datosSemana.horasLunes || 0) + (datosSemana.horasDienstag || 0) + (datosSemana.horasMittwoch || 0) + (datosSemana.horasDonnerstag || 0) + (datosSemana.horasFreitag || 0);
                    lineasAsignadas = [totalSemana > 0 ? String(totalSemana) : ''];
                }

                lineasAsignadas = lineasAsignadas.filter(l => l && l !== '' && l !== '0');
                if (lineasAsignadas.length === 0) continue;

                const x = Number(box.x1);
                const yPdfLibTop = Number(box.y1);
                const anchoCaja = Math.max(10, Number(box.x2) - Number(box.x1));

                const esEncabezado = lowerKey.includes('schueler') || lowerKey.includes('klasse') || lowerKey.includes('class') || lowerKey.includes('woche') || lowerKey.includes('semana') || lowerKey.includes('lapso') || lowerKey.includes('lehrer') || lowerKey.includes('lehrkraft') || lowerKey.includes('teacher') || lowerKey.includes('ausbildung') || lowerKey.includes('ausbildungsrichtung') || lowerKey.includes('beruf') || lowerKey.includes('workplace') || lowerKey.includes('betrieb') || lowerKey.includes('ausbildungsstaette');
                const fontSize = esEncabezado ? 10.5 : 8.5;
                const espaciadoLineas = fontSize * 1.4;

                let lineasFinalesParaDibujar = [];
                lineasAsignadas.forEach(parrafo => {
                    const palabras = String(parrafo).trim().split(/\s+/);
                    let lineaActual = '';

                    palabras.forEach(palabra => {
                        const pruebaLinea = lineaActual ? `${lineaActual} ${palabra}` : palabra;
                        const anchoPrueba = font.widthOfTextAtSize(pruebaLinea, fontSize);

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
                            font: font,
                            color: PDFLib.rgb(0, 0, 0)
                        });
                    } catch (innerErr) {
                        console.error(`❌ Fehler beim Drucken im Feld "${campo}":`, innerErr);
                    }
                });
            }

            const pdfBytesFinales = await pdfDocLib.save();
            const blob = new Blob([pdfBytesFinales], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Taetigkeitsnachweis_${nombreUsuarioActual}_${semSeleccionada}.pdf`;
            link.click();

            estadoInfoModal.textContent = "🎉 ¡PDF generiert und erfolgreich heruntergeladen!";
        } catch (err) {
            console.error("🔥 PDF-LIB FEHLER:", err);
            estadoInfoModal.textContent = "❌ Fehler beim Generieren des PDFs.";
            alert("Kritischer Fehler: " + err.message);
        }
    });
}
