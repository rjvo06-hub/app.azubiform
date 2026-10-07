import { SUPABASE_URL, headers } from './config.js';

export function inicializarLectorYAnalizadorPdf(contenedorId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="space-y-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <h3 class="text-sm font-bold text-gray-800">PDF-Manager (Bereit)</h3>
            <p class="text-xs text-gray-600">Das Modul wurde erfolgreich geladen. Wähle eine Option aus:</p>
            <div class="space-y-2">
                <input type="file" id="inputArchivoAuto" accept="application/pdf" class="w-full text-xs text-gray-500">
                <div id="resultadoAnalisisAuto" class="hidden text-xs text-emerald-600 font-bold">✅ PDF bereit.</div>
            </div>
        </div>
    `;

    const inputArchivo = contenedor.querySelector('#inputArchivoAuto');
    const divResultado = contenedor.querySelector('#resultadoAnalisisAuto');

    inputArchivo.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            divResultado.classList.remove('hidden');
        }
    });
}
