import { SUPABASE_URL, headers } from './config.js';

export function iniciarAppPrincipal(nombreUsuario) {
    const loginSection = document.getElementById('loginSection');
    const appSection = document.getElementById('appSection');
    const lblUsuario = document.getElementById('lblUsuario');

    loginSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    document.body.classList.remove('justify-center');
    lblUsuario.textContent = nombreUsuario;

    const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fechaHoyStr = new Date().toLocaleDateString('de-DE', opcionesFecha);
    document.getElementById('fechaActual').textContent = fechaHoyStr.charAt(0).toUpperCase() + fechaHoyStr.slice(1);
    const hoyISO = new Date().toISOString().split('T')[0];

    const formulario = document.getElementById('registroForm');
    const inputActividad = document.getElementById('actividad');
    const btnSubmitActividad = document.getElementById('btnSubmitActividad');
    const contenedorSugerencias = document.getElementById('sugerencias');
    const listaActividades = document.getElementById('listaActividades');
    const contador = document.getElementById('contador');
    const mensaje = document.getElementById('mensaje');

    const modalPasado = document.getElementById('modalPasado');
    const inputFechaPasada = document.getElementById('fechaPasada');
    const inputActividadPasada = document.getElementById('actividadPasada');
    const sugerenciasPasadas = document.getElementById('sugerenciasPasadas');
    const formPasado = document.getElementById('formPasado');
    const btnSubmitPasado = document.getElementById('btnSubmitPasado');
    const mensajePasado = document.getElementById('mensajePasado');
    const listaActividadesPasadas = document.getElementById('listaActividadesPasadas');
    const contadorPasado = document.getElementById('contadorPasado');

    window.abrirModalPasado = function() {
        modalPasado.classList.remove('hidden');
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        const fechaAyerStr = ayer.toISOString().split('T')[0];
        inputFechaPasada.value = fechaAyerStr;
        inputActividadPasada.value = '';
        cargarActividadesPasadas(fechaAyerStr);
        inputActividadPasada.focus();
    };

    window.cerrarModalPasado = function() {
        modalPasado.classList.add('hidden');
        mensajePasado.classList.add('hidden');
        cargarActividadesHoy();
    };

    inputFechaPasada.addEventListener('change', (e) => {
        cargarActividadesPasadas(e.target.value);
    });

    async function cargarActividadesPasadas(fecha) {
        if (!fecha) return;
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/registro_diario?fecha=eq.${fecha}&usuario=eq.${encodeURIComponent(nombreUsuario)}&order=created_at.desc`, {
                method: 'GET', headers: headers
            });
            const data = await res.json();
            if (!data || data.length === 0) {
                listaActividadesPasadas.innerHTML = '<p class="text-xs text-gray-400 text-center py-2">Keine Aktivitäten für dieses Datum erfasst.</p>';
                contadorPasado.textContent = '0 erfasst';
                return;
            }
            contadorPasado.textContent = `${data.length} erfasst`;
            listaActividadesPasadas.innerHTML = '';
            data.forEach((item) => {
                const div = document.createElement('div');
                div.className = 'flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100 text-sm';
                div.innerHTML = `<span class="text-gray-700 font-medium">${item.nombre_actividad}</span><span class="text-[10px] text-gray-400">${item.hora || ''}</span>`;
                listaActividadesPasadas.appendChild(div);
            });
        } catch (err) { console.error(err); }
    }

    inputActividad.addEventListener('input', async (e) => {
        const textoBusqueda = e.target.value.trim();
        if (textoBusqueda.length < 2) { contenedorSugerencias.classList.add('hidden'); return; }
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/actividades_catalogo?nombre_actividad=ilike.${encodeURIComponent('%' + textoBusqueda + '%')}&limit=5`, { headers });
            const data = await res.json();
            if (!data || data.length === 0) { contenedorSugerencias.classList.add('hidden'); return; }
            contenedorSugerencias.innerHTML = '';
            data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 cursor-pointer border-b border-gray-100';
                div.textContent = item.nombre_actividad;
                div.addEventListener('click', () => { inputActividad.value = item.nombre_actividad; contenedorSugerencias.classList.add('hidden'); });
                contenedorSugerencias.appendChild(div);
            });
            contenedorSugerencias.classList.remove('hidden');
        } catch (err) { console.error(err); }
    });

    inputActividadPasada.addEventListener('input', async (e) => {
        const textoBusqueda = e.target.value.trim();
        if (textoBusqueda.length < 2) { sugerenciasPasadas.classList.add('hidden'); return; }
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/actividades_catalogo?nombre_actividad=ilike.${encodeURIComponent('%' + textoBusqueda + '%')}&limit=5`, { headers });
            const data = await res.json();
            if (!data || data.length === 0) { sugerenciasPasadas.classList.add('hidden'); return; }
            sugerenciasPasadas.innerHTML = '';
            data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 cursor-pointer border-b border-gray-100';
                div.textContent = item.nombre_actividad;
                div.addEventListener('click', () => { inputActividadPasada.value = item.nombre_actividad; sugerenciasPasadas.classList.add('hidden'); });
                sugerenciasPasadas.appendChild(div);
            });
            sugerenciasPasadas.classList.remove('hidden');
        } catch (err) { console.error(err); }
    });

    async function cargarActividadesHoy() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/registro_diario?fecha=eq.${hoyISO}&usuario=eq.${encodeURIComponent(nombreUsuario)}&order=created_at.desc`, { headers });
            const data = await res.json();
            if (!data || data.length === 0) {
                listaActividades.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">Heute wurden noch keine Aktivitäten erfasst.</p>';
                contador.textContent = '0 erfasst';
                return;
            }
            contador.textContent = `${data.length} erfasst`;
            listaActividades.innerHTML = '';
            data.forEach((item) => {
                const div = document.createElement('div');
                div.className = 'flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-sm';
                div.innerHTML = `<span class="text-gray-700 font-medium">${item.nombre_actividad}</span><span class="text-[10px] text-gray-400">${item.hora || ''}</span>`;
                listaActividades.appendChild(div);
            });
        } catch (err) { console.error(err); }
    }

    formulario.onsubmit = async (e) => {
        e.preventDefault();
        const nombreActividad = inputActividad.value.trim();
        if (!nombreActividad) return;
        btnSubmitActividad.disabled = true;
        btnSubmitActividad.textContent = 'Wird gespeichert...';
        const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        try {
            await fetch(`${SUPABASE_URL}/rest/v1/registro_diario`, {
                method: 'POST', headers: headers,
                body: JSON.stringify({ nombre_actividad: nombreActividad, fecha: hoyISO, hora: horaActual, usuario: nombreUsuario })
            });
            await fetch(`${SUPABASE_URL}/rest/v1/actividades_catalogo?on_conflict=nombre_actividad`, {
                method: 'POST', headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
                body: JSON.stringify({ nombre_actividad: nombreActividad })
            });
            btnSubmitActividad.disabled = false;
            btnSubmitActividad.textContent = 'Zur Liste hinzufügen';
            mensaje.textContent = '✓ Aktivität hinzugefügt!';
            mensaje.className = 'text-xs text-center py-2 mt-3 rounded-lg font-medium bg-green-100 text-green-700';
            mensaje.classList.remove('hidden');
            inputActividad.value = '';
            contenedorSugerencias.classList.add('hidden');
            inputActividad.focus();
            setTimeout(() => mensaje.classList.add('hidden'), 2000);
            cargarActividadesHoy();
        } catch (err) {
            btnSubmitActividad.disabled = false;
            btnSubmitActividad.textContent = 'Zur Liste hinzufügen';
            mensaje.textContent = '❌ Fehler beim Speichern.';
            mensaje.className = 'text-xs text-center py-2 mt-3 rounded-lg font-medium bg-red-100 text-red-700';
            mensaje.classList.remove('hidden');
        }
    };

    formPasado.onsubmit = async (e) => {
        e.preventDefault();
        const fechaElegida = inputFechaPasada.value;
        const nombreActividad = inputActividadPasada.value.trim();
        if (!fechaElegida || !nombreActividad) return;
        btnSubmitPasado.disabled = true;
        btnSubmitPasado.textContent = 'Wird gespeichert...';

        try {
            await fetch(`${SUPABASE_URL}/rest/v1/registro_diario`, {
                method: 'POST', headers: headers,
                body: JSON.stringify({ nombre_actividad: nombreActividad, fecha: fechaElegida, hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), usuario: nombreUsuario })
            });
            await fetch(`${SUPABASE_URL}/rest/v1/actividades_catalogo?on_conflict=nombre_actividad`, {
                method: 'POST', headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
                body: JSON.stringify({ nombre_actividad: nombreActividad })
            });
            btnSubmitPasado.disabled = false;
            btnSubmitPasado.textContent = 'Vergangene Aktivität hinzufügen';
            mensajePasado.textContent = `✓ Für den ${fechaElegida} gespeichert!`;
            mensajePasado.className = 'text-xs text-center py-1.5 mb-3 rounded-lg font-medium bg-green-100 text-green-700';
            mensajePasado.classList.remove('hidden');
            inputActividadPasada.value = '';
            sugerenciasPasadas.classList.add('hidden');
            inputActividadPasada.focus();
            setTimeout(() => mensajePasado.classList.add('hidden'), 2000);
            cargarActividadesPasadas(fechaElegida);
        } catch (err) {
            btnSubmitPasado.disabled = false;
            btnSubmitPasado.textContent = 'Vergangene Aktivität hinzufügen';
            mensajePasado.textContent = '❌ Fehler beim Speichern.';
            mensajePasado.className = 'text-xs text-center py-1.5 mb-3 rounded-lg font-medium bg-red-100 text-red-700';
            mensajePasado.classList.remove('hidden');
        }
    };

    cargarActividadesHoy();
}
