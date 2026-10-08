import { SUPABASE_URL, headers } from './config.js';

export async function generarVistaPreviaImpresionDirecta(contenedorId, usuarioId, registroId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="space-y-4 flex flex-col items-center">
            <div class="relative overflow-auto border border-gray-300 rounded-lg bg-gray-900 flex justify-center p-2 max-h-[75vh] w-full">
                <div class="relative inline-block" id="previewWrapper">
                    <canvas id="previewCanvas" class="block shadow-lg"></canvas>
                    <div id="previewOverlay" class="absolute inset-0 pointer-events-none"></div>
                </div>
            </div>
        </div>
    `;

    const canvas = contenedor.querySelector('#previewCanvas');
    const overlay = contenedor.querySelector('#previewOverlay');

    try {
        // 1. Obtener los datos del usuario para conocer su 'school_name'
        const resUsuario = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?id=eq.${usuarioId}&select=*`, {
            headers: headers
        });
        const usuarios = await resUsuario.json();
        if (!usuarios || usuarios.length === 0) throw new Error("Usuario no encontrado.");
        
        const schoolName = usuarios[0].school_name;
        if (!schoolName) throw new Error("El usuario no tiene asignado un 'school_name'.");

        // 2. Obtener la plantilla y sus coordenadas exactas desde 'school_templates'
        const resTemplate = await fetch(`${SUPABASE_URL}/rest/v1/school_templates?school_name=eq.${encodeURIComponent(schoolName)}&select=*`, {
            headers: headers
        });
        const templates = await resTemplate.json();
        if (!templates || templates.length === 0) throw new Error(`No se encontró plantilla para la escuela: ${schoolName}`);
        
        const plantilla = templates[0];
        const coordenadas = plantilla.coordinates_json || {};

        // 3. Obtener el registro específico de la semana indicada
        const resRegistro = await fetch(`${SUPABASE_URL}/rest/v1/registro_diario?id=eq.${registroId}&select=*`, {
            headers: headers
        });
        const registros = await resRegistro.json();
        if (!registros || registros.length === 0) throw new Error("No se encontraron datos para esta semana.");
        
        const datosSemana = registros[0];

        // 4. Renderizar el PDF base usando PDF.js
        const loadingTask = pdfjsLib.getDocument(`./${plantilla.pdf_filename || 'admin.pdf'}`);
        const pdfDoc = await loadingTask.promise;
        const pagina = await pdfDoc.getPage(1);

        const scale = 1.5;
        const pdfPageViewport = pagina.getViewport({ scale });
        const pdfPageHeight = pdfPageViewport.height;

        const context = canvas.getContext('2d');
        canvas.height = pdfPageHeight;
        canvas.width = pdfPageViewport.width;

        await pagina.render({ canvasContext: context, viewport: pdfPageViewport }).promise;

        // 5. Superponer los textos usando exactamente las coordenadas X/Y guardadas
        overlay.innerHTML = '';
        for (const [key, box] of Object.entries(coordenadas)) {
            if (!box) continue;

            const left = box.x1 * scale;
            const top = pdfPageHeight - (box.y2 * scale);
            const width = (box.x2 - box.x1) * scale;
            const height = (box.y2 - box.y1) * scale;

            const elTexto = document.createElement('div');
            elTexto.className = 'absolute text-[10px] text-black font-sans overflow-hidden px-1 flex items-center bg-white/70 border border-indigo-300/80 rounded';
            elTexto.style.left = `${left}px`;
            elTexto.style.top = `${top}px`;
            elTexto.style.width = `${width}px`;
            elTexto.style.height = `${height}px`;
            
            // Muestra los datos precargados; si falta algún campo, queda en blanco respetando el espacio
            elTexto.textContent = datosSemana[key] !== undefined && datosSemana[key] !== null ? datosSemana[key] : '';

            overlay.appendChild(elTexto);
        }

    } catch (err) {
        console.error("Error al generar la vista previa directa:", err);
        alert("❌ Error: " + err.message);
    }
}

window.generarVistaPreviaImpresionDirecta = generarVistaPreviaImpresionDirecta;
