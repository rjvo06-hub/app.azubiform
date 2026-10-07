export function inicializarAnalizadorPdf(contenedorId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="p-4 bg-white rounded-xl shadow-lg border border-gray-200">
            <h3 class="font-bold text-sm text-indigo-700 mb-2">PDF Template Analyzer & Inspector</h3>
            <input type="file" id="inputPdfFile" accept="application/pdf" class="mb-3 text-xs">
            <div id="infoCoordenadas" class="text-xs bg-gray-50 p-2 rounded mb-2 font-mono text-gray-700">
                Klicke auf das PDF, um X und Y zu erhalten...
            </div>
            <div class="relative border border-gray-300 overflow-auto max-h-[500px] flex justify-center bg-gray-100">
                <canvas id="pdfCanvas" class="shadow-md cursor-crosshair"></canvas>
            </div>
        </div>
    `;

    const inputFile = document.getElementById('inputPdfFile');
    const canvas = document.getElementById('pdfCanvas');
    const infoDiv = document.getElementById('infoCoordenadas');
    const ctx = canvas.getContext('2d');

    inputFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileReader = new FileReader();
        fileReader.onload = async function() {
            const typedarray = new Uint8Array(this.result);
            
            // Cargar el documento PDF con PDF.js
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            const page = await pdf.getPage(1); // Analizamos la primera página

            const scale = 1.5; // Escala de visualización
            const viewport = page.getViewport({ scale: scale });

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Renderizar la página PDF en el Canvas de HTML5
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            await page.render(renderContext).promise;
            console.log("PDF renderizado para análisis.");

            // Extraer y listar textos y sus posiciones automáticas
            const textContent = await page.getTextContent();
            console.log("Textos detectados en el PDF:", textContent.items.map(item => ({
                texto: item.str,
                x: item.transform[4],
                y: item.transform[5]
            })));
        };
        fileReader.readAsArrayBuffer(file);
    });

    // Capturar clics para obtener coordenadas exactas de mapeo
    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const scale = 1.5;
        
        // Coordenadas relativas al canvas original del PDF
        const x = (event.clientX - rect.left) / scale;
        // Invertir el eje Y si la librería de impresión usa el origen abajo
        const y = (canvas.height - (event.clientY - rect.top)) / scale;

        infoDiv.innerHTML = `<strong>Ausgewählte Position:</strong> X: ${x.toFixed(2)} | Y: ${y.toFixed(2)}`;
        console.log(`Coordenada mapeada -> X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}`);
    });
}
