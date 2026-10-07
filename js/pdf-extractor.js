export function inicializarLectorYAnalizadorPdf(contenedorId, supabaseClient) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    // Interfaz unificada para Analizar (Admin) e Importar (Cliente)
    contenedor.innerHTML = `
        <div class="p-6 bg-white rounded-xl shadow-lg border border-gray-200 space-y-6">
            <div>
                <h3 class="font-bold text-base text-indigo-700 mb-1">Gestor y Extractor de Datos PDF</h3>
                <p class="text-xs text-gray-500">Inspecciona plantillas en la base de datos o extrae los datos de un PDF subido por el cliente.</p>
            </div>

            <!-- SECCIÓN 1: IMPORTAR Y EXTRAER DATOS DEL PDF DEL CLIENTE -->
            <div class="bg-indigo-50 border border-indigo-100 p-4 rounded-lg space-y-3">
                <h4 class="font-bold text-xs text-indigo-900 uppercase">1. Extraer datos del PDF del cliente</h4>
                <div>
                    <label class="block text-[10px] font-semibold text-gray-700 uppercase mb-1">Seleccionar Identificador de Plantilla (Opcional)</label>
                    <input type="text" id="filtroFileIdentifier" placeholder="Ej. fos_holzkirchen_2026" class="text-xs p-2 border border-indigo-200 rounded w-full bg-white">
                </div>
                <div>
                    <label class="block text-[10px] font-semibold text-gray-700 uppercase mb-1">Subir PDF Relleno del Cliente</label>
                    <input type="file" id="inputPdfClienteFile" accept="application/pdf" class="text-xs border border-indigo-200 p-2 rounded w-full bg-white">
                </div>
                <button id="btnProcesarPdfCliente" class="w-full bg-indigo-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition shadow">
                    Extraer y Procesar Datos del PDF
                </button>
                <div id="resultadoProcesoCliente" class="text-xs bg-white p-3 rounded border border-indigo-200 font-mono text-gray-700 hidden max-h-40 overflow-y-auto"></div>
            </div>

            <!-- SECCIÓN 2: ANALIZADOR Y MAPEADOR DE PLANTILLAS (ADMIN) -->
            <div class="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-3">
                <h4 class="font-bold text-xs text-gray-800 uppercase">2. Inspector de Plantillas (Admin)</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input type="text" id="schoolNameInput" placeholder="Nombre (Ej. FOS Holzkirchen)" class="text-xs p-2 border rounded bg-white">
                    <input type="text" id="fileIdentifierInput" placeholder="Identificador único (Ej. fos_holzkirchen_2026)" class="text-xs p-2 border rounded bg-white">
                </div>
                <input type="file" id="inputPdfAdminFile" accept="application/pdf" class="text-xs border border-gray-300 p-2 rounded w-full bg-white">
                <div id="infoCoordenadas" class="text-xs bg-white p-2 rounded border border-gray-300 font-mono text-gray-700">
                    Klicke auf das PDF, um X und Y zu erhalten...
                </div>
                <div class="relative border border-gray-300 rounded overflow-auto max-h-[400px] flex justify-center bg-gray-200">
                    <canvas id="pdfCanvasAdmin" class="shadow-md cursor-crosshair"></canvas>
                </div>
                <button id="btnGuardarPlantilla" class="w-full bg-gray-800 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition">
                    Guardar Coordenadas en Supabase
                </button>
            </div>
        </div>
    `;

    // --- LÓGICA 1: EXTRACCIÓN DE DATOS DEL CLIENTE ---
    const inputPdfCliente = document.getElementById('inputPdfClienteFile');
    const btnProcesarCliente = document.getElementById('btnProcesarPdfCliente');
    const resultadoProcesoCliente = document.getElementById('resultadoProcesoCliente');
    const filtroIdentifier = document.getElementById('filtroFileIdentifier');

    btnProcesarCliente.addEventListener('click', async () => {
        const file = inputPdfCliente.files[0];
        if (!file) {
            alert("Por favor, selecciona un archivo PDF para procesar.");
            return;
        }

        resultadoProcesoCliente.classList.remove('hidden');
        resultadoProcesoCliente.textContent = "Procesando documento PDF...";

        const fileReader = new FileReader();
        fileReader.onload = async function() {
            try {
                const typedarray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                const page = await pdf.getPage(1);
                
                // Obtener texto estructurado y coordenadas internas de los elementos
                const textContent = await page.getTextContent();
                
                let datosExtraidos = [];
                let textoPlanoCompleto = "";

                // Si el cliente especificó una plantilla, podemos consultar las coordenadas en Supabase
                let plantillaCoordenadas = null;
                const identifierVal = filtroIdentifier.value.trim();
                
                if (identifierVal && supabaseClient) {
                    const { data, error } = await supabaseClient
                        .from('school_templates')
                        .select('*')
                        .eq('file_identifier', identifierVal)
                        .single();
                    
                    if (data) {
                        plantillaCoordenadas = data.coordinates_json;
                        console.log("Plantilla cargada desde Supabase:", plantillaCoordenadas);
                    }
                }

                // Recorremos los elementos de texto del PDF
                textContent.items.forEach((item) => {
                    const texto = item.str;
                    const x = item.transform[4];
                    const y = item.transform[5];
                    
                    datosExtraidos.push({ texto, x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
                    textoPlanoCompleto += texto + " ";
                });

                resultadoProcesoCliente.innerHTML = `
                    <strong class="text-indigo-700">¡Extracción completada con éxito!</strong><br>
                    - Elementos de texto detectados: ${datosExtraidos.length}<br>
                    - Texto resumido: <span class="text-gray-500">${textoPlanoCompleto.substring(0, 100)}...</span>
                `;

                // AQUÍ PUEDES INYECTAR LOS DATOS EXTRAÍDOS A LOS INPUTS DE TU APLICACIÓN
                // Por ejemplo: document.getElementById('tu-input').value = valorExtraido;

            } catch (err) {
                console.error("Error al procesar el PDF:", err);
                resultadoProcesoCliente.textContent = "Error al leer el archivo PDF.";
            }
        };
        fileReader.readAsArrayBuffer(file);
    });

    // --- LÓGICA 2: ANALIZADOR Y MAPEADOR DE PLANTILLAS (ADMIN) ---
    const inputPdfAdmin = document.getElementById('inputPdfAdminFile');
    const canvasAdmin = document.getElementById('pdfCanvasAdmin');
    const infoCoordenadas = document.getElementById('infoCoordenadas');
    const btnGuardarPlantilla = document.getElementById('btnGuardarPlantilla');
    const schoolNameInput = document.getElementById('schoolNameInput');
    const fileIdentifierInput = document.getElementById('fileIdentifierInput');
    const ctxAdmin = canvasAdmin.getContext('2d');

    let coordenadasMapeadas = { puntos: [] };
    let nombreArchivoAdmin = "";

    inputPdfAdmin.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        nombreArchivoAdmin = file.name;

        const fileReader = new FileReader();
        fileReader.onload = async function() {
            const typedarray = new Uint8Array(this.result);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            const page = await pdf.getPage(1);

            const scale = 1.5;
            const viewport = page.getViewport({ scale: scale });

            canvasAdmin.height = viewport.height;
            canvasAdmin.width = viewport.width;

            await page.render({
                canvasContext: ctxAdmin,
                viewport: viewport
            }).promise;
            
            infoCoordenadas.textContent = "PDF cargado. Haz clic en el documento para registrar coordenadas.";
        };
        fileReader.readAsArrayBuffer(file);
    });

    canvasAdmin.addEventListener('click', (event) => {
        const rect = canvasAdmin.getBoundingClientRect();
        const scale = 1.5;
        
        const x = Number(((event.clientX - rect.left) / scale).toFixed(2));
        const y = Number(((canvasAdmin.height - (event.clientY - rect.top)) / scale).toFixed(2));

        infoCoordenadas.innerHTML = `<strong>Punto registrado -></strong> X: ${x} | Y: ${y} (Total: ${coordenadasMapeadas.puntos.length + 1})`;
        coordenadasMapeadas.puntos.push({ x, y });
    });

    btnGuardarPlantilla.addEventListener('click', async () => {
        const schoolName = schoolNameInput.value.trim();
        const fileIdentifier = fileIdentifierInput.value.trim();

        if (!schoolName || !fileIdentifier) {
            alert("Por favor, introduce el nombre de la escuela y el identificador único.");
            return;
        }

        if (!supabaseClient) {
            alert("Cliente de Supabase no configurado.");
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from('school_templates')
                .upsert([
                    {
                        school_name: schoolName,
                        file_identifier: fileIdentifier,
                        pdf_filename: nombreArchivoAdmin,
                        coordinates_json: coordenadasMapeadas
                    }
                ], { onConflict: 'file_identifier' });

            if (error) {
                alert("Error al guardar en Supabase: " + error.message);
            } else {
                alert("¡Coordenadas guardadas exitosamente en la base de datos!");
            }
        } catch (err) {
            alert("Ocurrió un error inesperado al guardar.");
        }
    });
}
