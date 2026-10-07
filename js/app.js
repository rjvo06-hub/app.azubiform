<div class="space-x-1.5 flex items-center">
    <button onclick="abrirModalConsulta()" class="text-indigo-600 font-semibold hover:underline">Abfragen</button>
    <span class="text-gray-300">|</span>
    <button onclick="abrirModalImpresion()" class="text-emerald-600 font-semibold hover:underline">Drucken</button>
    
    <!-- Enlace oculto para el Admin PDF -->
    <span id="sepAdminPdf" class="text-gray-300" style="display: none;">|</span>
    <a id="linkAdminPdf" href="./admin-pdf.html" style="display: none;" class="text-amber-600 font-semibold hover:underline">Admin PDF</a>

    <span class="text-gray-300">|</span>
    <button onclick="cerrarSesion()" class="text-red-500 hover:underline">Abmelden</button>
</div>
