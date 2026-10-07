export function inicializarLectorYAnalizadorPdf(contenedorId, supabaseClient) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    // Estructura visual ultra-amigable del asistente guiado
    contenedor.innerHTML = `
        <div class="space-y-6">
            <!-- PESTAÑAS DE NAVEGACIÓN INTERNA -->
            <div class="flex border-b border-gray-200">
                <button type="button" id="tabModoInspector" class="pb-2 px-4 text-xs font-bold text-amber-600 border-b-2 border-amber-600 focus:outline-none transition">🪄 Assistent: Neue Vorlage einrichten</button>
            </div>

            <!-- ASISTENTE GUIADO DE MAPEO -->
            <div id="seccionInspector" class="space-y-4">
                <div class="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                    <h3 class="text-xs font-bold text-amber-900 uppercase mb-1">Vorlagen-Assistent (Schritt-für-Schritt)</h3>
                    <p id="instruccionPaso" class="text-xs text-amber-800 font-medium">Lade zuerst eine leere PDF-Vorlage hoch, um zu beginnen.</p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div>
                        <label class="block text-[10px] font-bold text-gray-700 uppercase mb-1">1. Name der Schule / Vorlage</label>
                        <input type="text" id="inputNombrePlantilla" placeholder="z.B. FOS Holzkirchen" class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-700 uppercase mb-1">2. Eindeutiger Code (ID)</label>
                        <input type="text" id="inputCodigoPlantilla" placeholder="z.B. fos_holzkirchen" class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none">
                    </div>
                </div>

                <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <label class="block text-[10px] font-bold text-gray-700 uppercase mb-1">3. Leere PDF-Datei hochladen</label>
                    <input type="file" id="inputArchivoPlantilla" accept="application/pdf" class="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer">
                </div>

                <!-- CONTENEDOR VISUAL DEL VISOR PDF Y PASOS -->
                <div id="contenedorVisorAsistente" class="hidden space-y-4">
                    <div class="flex flex-wrap gap-2 items-center justify-between bg-gray-900 text-white p-3 rounded-xl">
                        <div id="estadoAsistenteTexto" class="text-xs font-semibold text-amber-400">Schritt 1: Klicke auf das Feld für den Namen des Schülers</div>
                        <button type="button" id="btnSiguientePaso" class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">Nächster Schritt →</button>
                    </div>

                    <!-- ZONA DEL LIENZO PDF -->
                    <div class="relative bg-gray-200 border-2 border-dashed border-gray-400 rounded-xl overflow-auto flex justify-center p-4 max-h-[60vh]" id="zonaCanvasPdf">
                        <canvas id="pdfCanvasInspector" class="shadow-2xl bg-white cursor-crosshair"></canvas>
                        <div id="capaPines" class="absolute inset-0 pointer-events-none"></div>
                    </div>
                </div>

                <div class="flex justify-end pt-2">
                    <button type="button" id="btnGuardarPlantillaSupabase" class="hidden bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition">💾 Vorlage in Supabase speichern</button>
                </div>
            </div>
        </div>
    `;

    //
