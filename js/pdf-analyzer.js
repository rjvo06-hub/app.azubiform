export function inicializarAnalizadorPdf(contenedorId, supabaseClient) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="p-4 bg-white rounded-xl shadow-lg border border-gray-200">
            <h3 class="font-bold text-sm text-indigo-700 mb-2">PDF Template Analyzer & Inspector</h3>
            <input type="file" id="inputPdfFile" accept="application/pdf" class="mb-3 text-xs">
            
            <!-- Campos para identificar la plantilla a guardar -->
            <div class="mb-3 grid grid-cols-2 gap-2">
                <input type="text" id="schoolNameInput" placeholder="Nombre (Ej. FOS Holzkirchen)" class="text-xs p-1 border rounded">
                <input type="text" id="fileIdentifierInput" placeholder="Identificador único (Ej. fos_holzkirchen_2026)" class="text-xs p-1 border rounded">
            </div>

            <div id="infoCoordenadas" class="text-xs bg-gray-50 p-2 rounded mb-2 font-mono text-gray-700">
                Klicke auf das PDF, um X und Y zu erhalten...
            </div>
            <div class="relative border border-gray-300 overflow-auto max-h-[500px] flex justify-center bg-gray-100 mb-3">
                <canvas id="pdfCanvas" class="shadow-md cursor-crosshair"></canvas>
            </div>
            
            <button id="btnGuardarPlantilla" class="w-full bg-indigo-600 text-white text-xs font-bold py-2 px-4 rounded hover:bg-indigo-700 transition">
                Guardar Coordenadas en Base de Datos
            </button>
        </div>
    `;

    const inputFile = document.getElementById('inputPdfFile');
    const canvas = document.getElementById('pdfCanvas');
    const infoDiv = document.getElementById('infoCoordenadas');
    const btnGuardar = document.getElementById('btnGuardarPlantilla');
    const schoolNameInput = document.getElementById('schoolNameInput');
    const fileIdentifierInput = document.getElementById('fileIdentifierInput');
    const ctx = canvas.getContext('2d');

    // Objeto temporal para almacenar las coordenadas mapeadas
    let coordenadasMapeadas = {
        puntos: []
    };

    let nombreArchivoActual = "";

    inputFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        nombreArchivoActual = file.name;

        const fileReader = new FileReader();
        fileReader.onload = async function() {
            const typedarray = new Uint8Array(this.result);
            
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            const page = await pdf.getPage(1);

            const scale = 1.5;
            const viewport = page.getViewport({ scale: scale });

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            await page.render(renderContext).promise;
            console.log("PDF renderizado para análisis.");
        };
        fileReader.readAsArrayBuffer(file);
    });

    // Capturar clics para obtener coordenadas exactas y acumularlas
    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const scale = 1.5;
        
        const x = (event.clientX - rect.left) / scale;
        const y = (canvas.height - (event.clientY - rect.top)) / scale;

        infoDiv.innerHTML = `<strong>Ausgewählte Position:</strong> X: ${x.toFixed(2)} | Y: ${y.toFixed(2)}`;
        console.log(`Coordenada mapeada -> X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}`);

        // Guardamos temporalmente el punto clickeado
        coordenadasMapeadas.puntos.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
    });

    // Evento para guardar en la tabla school_templates de Supabase
    btnGuardar.addEventListener('click', async () => {
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
            // Inserción en la tabla school_templates usando Supabase
            const { data, error } = await supabaseClient
                .from('school_templates')
                .upsert([
                    {
                        school_name: schoolName,
                        file_identifier: fileIdentifier,
                        pdf_filename: nombreArchivoActual,
                        coordinates_json: coordenadasMapeadas
                    }
                ], { onConflict: 'file_identifier' }); // Si ya existe el identificador, lo actualiza

            if (error) {
                console.error("Error al guardar en Supabase:", error);
                alert("Error al guardar las coordenadas: " + error.message);
            } else {
                alert("¡Coordenadas guardadas exitosamente en la base de datos!");
                console.log("Guardado exitoso:", data);
            }
        } catch (err) {
            console.error("Excepción inesperada:", err);
            alert("Ocurrió un error inesperado al guardar.");
        }
    });
}
