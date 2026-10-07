import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

// Inicializar Supabase directamente con tus credenciales seguras
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export function inicializarLectorYAnalizadorPdf(contenedorId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="space-y-4">
            <div class="flex border-b border-gray-200">
                <button type="button" class="pb-2 px-4 text-xs font-bold text-indigo-600 border-b-2 border-indigo-600 focus:outline-none">🤖 Automatischer PDF-Intelligenz-Scanner</button>
            </div>

            <div class="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg">
                <h3 class="text-xs font-bold text-indigo-900 uppercase mb-1">Automatische Texterkennung & Feld-Mapping</h3>
                <p class="text-xs text-indigo-800">Lade deinen leeren <code class="bg-white px-1 py-0.5 rounded font-bold">admin.pdf</code> hoch. Das System scannt die Labels und speichert sie in <code class="font-bold">school_templates</code>.</p>
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

            <div id="resultadoAnalisisAuto" class="hidden bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 text-xs">
                <div class="flex items-center space-x-2 text-emerald-600 font-bold">
                    <span>✅</span> <span id="lblEstadoEscaneo">PDF erfolgreich analysiert und Felder automatisch zugeordnet!</span>
                </div>
                <div id="logCoordenadasDetectadas" class="bg-gray-50 p-3 rounded-lg font-mono text-[10px] text-gray-600 max-h-40 overflow-y-auto border border-gray-200"></div>
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

    let coordenadasDetectadas = {};
    let nombreArchivoOriginal = '';

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
                        coordenadasDetectadas.miércoles_texto = { x1: x + 70, y1: y - 5, x2: x + 350, y2: y + 35 };
                        coordenadasDetectadas.miércoles_horas = { x1: x + 360, y1: y - 5, x2: x + 420, y2: y + 35 };
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

                logCoordenadas.textContent = JSON.stringify(coordenadasDetectadas, null, 2);
                divResultado.classList.remove('hidden');

            } catch (err) {
                console.error("Fehler beim Scannen:", err);
                alert("❌ Fehler beim automatischen Auslesen des PDFs.");
            }
        };
        lector.readAsArrayBuffer(archivo);
    });

    btnGuardar.addEventListener('click', async () => {
        const schoolName = inputSchoolName.value.trim();
        const fileIdentifier = inputFileIdentifier.value.trim();

        if (!schoolName || !fileIdentifier) {
            alert("Bitte fülle den Schulnamen und den Bezeichner aus.");
            return;
        }

        try {
            const { error: errSupabase } = await supabase
                .from('school_templates')
                .upsert({
                    school_name: schoolName,
                    file_identifier: fileIdentifier,
                    pdf_filename: nombreArchivoOriginal || 'admin.pdf'
                }, { onConflict: 'file_identifier' });

            if (errSupabase) throw errSupabase;

            alert("✅ Vorlage erfolgreich in der Tabelle 'school_templates' gespeichert!");
        } catch (err) {
            console.error("Fehler beim Speichern in school_templates:", err);
            alert("❌ Fehler: " + err.message);
        }
    });
}
