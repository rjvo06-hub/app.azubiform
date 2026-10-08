import { SUPABASE_URL, headers } from './js/config.js';

export async function inicializarPruebaVistaPreviaFos(contenedorId, usuarioId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    // Forzamos el ID de usuario a 93 para esta prueba
    const idPrueba = 93;

    contenedor.innerHTML = `
        <div class="space-y-4 p-4 bg-gray-50 rounded-xl shadow-sm">
            <div class="flex items-center justify-between border-b border-gray-200 pb-3">
                <h3 class="text-xs font-bold text-indigo-900 uppercase">📄 Modo de Prueba: Vista Previa con Coordenadas FOS (Usuario ID: ${idPrueba})</h3>
                <div class="flex items-center space-x-2 text-xs">
                    <label class="font-bold text-gray-700">Woche wählen:</label>
                    <select id="selectSemanaFos" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
                        <option value="">Lade Wochen...</option>
                    </select>
                </div>
            </div>

            <div class="bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded-r-lg text-xs">
                <p class="text-indigo-800">Entorno aislado mapeando las coordenadas X/Y del PDF vía PDF.js.</p>
            </div>

            <div class="relative overflow-auto border border-gray-300 rounded-lg bg-gray-900 flex justify-center p-2 max
