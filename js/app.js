import { SUPABASE_URL, headers } from './config.js';

export function iniciarAppPrincipal(nombreUsuario) {
    const loginSection = document.getElementById('loginSection');
    const appSection = document.getElementById('appSection');
    const lblUsuario = document.getElementById('lblUsuario');

    loginSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    document.body.classList.remove('justify-center');
    lblUsuario.textContent = nombreUsuario;

    const ausbildungUsuario = localStorage.getItem('usuario_ausbildung') || '';
    console.log("Ausbildung del usuario actual en localStorage:", ausbildungUsuario);

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

    let currentSpeechRecognition = null;

    window.registrarInstanciaVoz = function(recognition) {
        currentSpeechRecognition = recognition;
    };

    window.limpiarInstanciaVoz = function() {
        currentSpeechRecognition = null;
    };

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            if (currentSpeechRecognition) {
                try {
                    currentSpeechRecognition.abort();
                } catch (e) {
                    console.error("Error al abortar voz en segundo plano:", e);
                }
                currentSpeechRecognition = null;
            }
        }
    });

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

    // BUSCADOR INTELIGENTE CON FILTRO POR AUSBILDUNG Y RESPALDO GENERAL
    async function buscarActividades(textoBusqueda, contenedorSugerenciasEl, inputEl) {
        if (textoBusqueda.length < 2) { 
            contenedorSugerenciasEl.classList.add('hidden'); 
            return; 
        }
        try {
            let url = `${SUPABASE_URL}/rest/v1/actividades_catalogo?nombre_actividad=ilike.${encodeURIComponent('%' + textoBusqueda + '%')}`;
            if (ausbildungUsuario) {
                url += `&ausbildung=eq.${encodeURIComponent(ausbildungUsuario)}`;
            }
            url += `&limit=5`;

            let res = await fetch(url, { headers });
            let data = await res.json();

            // Si no encuentra con su ausbildung exacto, busca de forma general para que nunca quede vacío si hay datos
            if ((!data || data.length === 0)) {
                let urlGeneral = `${SUPABASE_URL}/rest/v1/actividades_catalogo?nombre_actividad=ilike.${encodeURIComponent('%' + textoBusqueda + '%')}&limit=5`;
                const resGeneral = await fetch(urlGeneral, { headers });
                data = await resGeneral.json();
            }

            if (!data || data.length === 0) {
                contenedorSugerenciasEl.classList.add('hidden');
                return;
            }

            contenedorSugerenciasEl.innerHTML = '';
            data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 cursor-pointer border-b border-gray-100';
                div.textContent = item.nombre_actividad;
                div.addEventListener('click', () => { 
                    inputEl.value = item.nombre_actividad; 
                    contenedorSugerenciasEl.classList.add('hidden'); 
                });
                contenedorSugerenciasEl.appendChild(div);
            });
            contenedorSugerenciasEl.classList.remove('hidden');
        } catch (err) { 
            console.error("Error en búsqueda de actividades:", err); 
        }
    }

    inputActividad.addEventListener('input', (e) => {
        buscarActividades(e.target.value.trim(), contenedorSugerencias, inputActividad);
    });

    inputActividadPasada.addEventListener('input', (e) => {
        buscarActividades(e.target.value.trim(), sugerenciasPasadas, inputActividadPasada);
    });

    async function cargarActividadesHoy() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/registro_diario?fecha=eq.${hoyISO}&order=created_at.desc`, { headers });
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
        } catch (err) { console.error("Error cargando actividades de hoy:", err); }
    }

    formulario.onsubmit = async (e) => {
        e.preventDefault();
        const nombreActividad = inputActividad.value.trim();
        if (!nombreActividad) return;
        btnSubmitActividad.disabled = true;
        btnSubmitActividad.textContent = 'Wird gespeichert...';
        const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        try {
            const responseRegistro = await fetch(`${SUPABASE_URL}/rest/v1/registro_diario`, {
                method: 'POST', 
                headers: headers,
                body: JSON.stringify({ 
                    nombre_actividad: nombreActividad, 
                    fecha: hoyISO, 
                    hora: horaActual, 
                    usuario: nombreUsuario,
                    ausbildung: ausbildungUsuario 
                })
            });

            if (!responseRegistro.ok) {
                const errorText = await responseRegistro.text();
                throw new Error("Supabase error: " + errorText);
            }
            
            await fetch(`${SUPABASE_URL}/rest/v1/actividades_catalogo?on_conflict=nombre_actividad,ausbildung`, {
                method: 'POST', 
                headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
                body: JSON.stringify({ 
                    nombre_actividad: nombreActividad,
                    ausbildung: ausbildungUsuario 
                })
            });

            inputActividad.value = '';
            contenedorSugerencias.classList.add('hidden');

            btnSubmitActividad.disabled = false;
            btnSubmitActividad.textContent = 'Zur Liste hinzufügen';
            mensaje.textContent = '✓ Aktivität hinzugefügt!';
            mensaje.className = 'text-xs text-center py-2 mt-3 rounded-lg font-medium bg-green-100 text-green-700';
            mensaje.classList.remove('hidden');
            inputActividad.focus();
            setTimeout(() => mensaje.classList.add('hidden'), 2000);
            cargarActividadesHoy();
        } catch (err) {
            alert("⚠️ " + err.message);
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
            const responsePasado = await fetch(`${SUPABASE_URL}/rest/v1/registro_diario`, {
                method: 'POST', 
                headers: headers,
                body: JSON.stringify({ 
                    nombre_actividad: nombreActividad, 
                    fecha: fechaElegida, 
                    hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
                    usuario: nombreUsuario,
                    ausbildung: ausbildungUsuario 
                })
            });

            if (!responsePasado.ok) {
                const errorText = await responsePasado.text();
                throw new Error("Supabase error (pasado): " + errorText);
            }

            await fetch(`${SUPABASE_URL}/rest/v1/actividades_catalogo?on_conflict=nombre_actividad,ausbildung`, {
                method: 'POST', 
                headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
                body: JSON.stringify({ 
                    nombre_actividad: nombreActividad,
                    ausbildung: ausbildungUsuario 
                })
            });

            inputActividadPasada.value = '';
            sugerenciasPasadas.classList.add('hidden');

            btnSubmitPasado.disabled = false;
            btnSubmitPasado.textContent = 'Vergangene Aktivität hinzufügen';
            mensajePasado.textContent = `✓ Für den ${fechaElegida} gespeichert!`;
            mensajePasado.className = 'text-xs text-center py-1.5 mb-3 rounded-lg font-medium bg-green-100 text-green-700';
            mensajePasado.classList.add('hidden');
            inputActividadPasada.focus();
            setTimeout(() => mensajePasado.classList.add('hidden'), 2000);
            cargarActividadesPasadas(fechaElegida);
        } catch (err) {
            alert("⚠ " + err.message);
            btnSubmitPasado.disabled = false;
            btnSubmitPasado.textContent = 'Vergangene Aktivität hinzufügen';
            mensajePasado.textContent = '❌ Fehler beim Speichern.';
            mensajePasado.className = 'text-xs text-center py-1.5 mb-3 rounded-lg font-medium bg-red-100 text-red-700';
            mensajePasado.classList.remove('hidden');
        }
    };

    cargarActividadesHoy();
}
