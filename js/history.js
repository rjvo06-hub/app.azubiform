import { SUPABASE_URL, headers } from './config.js';

export function inicializarHistorial() {
    const modalConsulta = document.getElementById('modalConsulta');
    const selectUsuarioConsulta = document.getElementById('selectUsuarioConsulta');
    const selectVistaConsulta = document.getElementById('selectVistaConsulta');
    const lblRangoPeriodoConsulta = document.getElementById('lblRangoPeriodoConsulta');
    const btnAnteriorConsulta = document.getElementById('btnAnteriorConsulta');
    const btnSiguienteConsulta = document.getElementById('btnSiguienteConsulta');
    const contenedorResultadosConsulta = document.getElementById('contenedorResultadosConsulta');
    let fechaActualPivote = new Date();

    window.abrirModalConsulta = async function() {
        modalConsulta.classList.remove('hidden');
        await cargarUsuariosEnSelect(selectUsuarioConsulta, consultarDatosModal);
    };

    window.cerrarModalConsulta = function() { 
        modalConsulta.classList.add('hidden'); 
    };

    async function cargarUsuariosEnSelect(elementoSelect, callbackDespues) {
        try {
            const usuarioActual = localStorage.getItem('usuario_actual');
            const accesoActual = Number(localStorage.getItem('usuario_acceso'));

            // Si el usuario NO es administrador (acceso diferente de 1), solo se permite ver a sí mismo
            if (accesoActual !== 1) {
                elementoSelect.innerHTML = '';
                const opt = document.createElement('option');
                opt.value = usuarioActual;
                opt.textContent = usuarioActual;
                elementoSelect.appendChild(opt);
                elementoSelect.value = usuarioActual;
                elementoSelect.disabled = true; // Bloquea el selector para que no pueda cambiarlo
            } else {
                // Si es administrador (acceso === 1), carga todos los usuarios con total libertad
                elementoSelect.disabled = false;
                const res = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?select=nombre,email`, { headers });
                const usuarios = await res.json();
                elementoSelect.innerHTML = '<option value="">-- Auswählen --</option>';
                usuarios.forEach(u => {
                    const opt = document.createElement('option');
                    opt.value = u.nombre;
                    opt.textContent = u.nombre;
                    elementoSelect.appendChild(opt);
                });
                if (usuarioActual) elementoSelect.value = usuarioActual;
                else if (usuarios.length > 0) elementoSelect.value = usuarios[0].nombre;
            }

            if (callbackDespues) callbackDespues();
        } catch (err) { console.error(err); }
    }

    function obtenerRangoSemana(d) {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const lunes = new Date(d.setDate(diff));
        const viernes = new Date(lunes);
        viernes.setDate(lunes.getDate() + 4);
        return { lunes, viernes };
    }

    // Función corregida para evitar desfases de zona horaria con los días lunes
    function formatearISO(date) { 
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0]; 
    }

    async function consultarDatosModal() {
        const usuario = selectUsuarioConsulta.value;
        const vista = selectVistaConsulta.value;
        if (!usuario) return;
        if (vista === 'semanal') {
            const { lunes, viernes } = obtenerRangoSemana(fechaActualPivote);
            lblRangoPeriodoConsulta.textContent = `Vom ${lunes.toLocaleDateString('de-DE')} bis zum ${viernes.toLocaleDateString('de-DE')}`;
            try {
                const res = await fetch(`${SUPABASE_URL}/rest/v1/registro_diario?usuario=eq.${encodeURIComponent(usuario)}&fecha=gte.${formatearISO(lunes)}&fecha=lte.${formatearISO(viernes)}&order=fecha.asc,hora.asc`, { headers });
                const data = await res.json();
                renderizarVistaSemanalModal(data, lunes);
            } catch (err) { console.error(err); }
        } else {
            const anio = fechaActualPivote.getFullYear();
            const mes = fechaActualPivote.getMonth();
            lblRangoPeriodoConsulta.textContent = fechaActualPivote.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
            try {
                const res = await fetch(`${SUPABASE_URL}/rest/v1/registro_diario?usuario=eq.${encodeURIComponent(usuario)}&fecha=gte.${formatearISO(new Date(anio, mes, 1))}&fecha=lte.${formatearISO(new Date(anio, mes + 1, 0))}&order=fecha.asc,hora.asc`, { headers });
                const data = await res.json();
                renderizarVistaMensualModal(data);
            } catch (err) { console.error(err); }
        }
    }

    function renderizarVistaSemanalModal(registros, lunesBase) {
        contenedorResultadosConsulta.innerHTML = '';
        ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'].forEach((nombreDia, index) => {
            const diaActual = new Date(lunesBase);
            diaActual.setDate(lunesBase.getDate() + index);
            const fechaStr = formatearISO(diaActual);
            const actsDelDia = registros.filter(r => r.fecha === fechaStr);
            const divDia = document.createElement('div');
            divDia.className = 'bg-gray-50 border border-gray-200 rounded-lg p-2.5';
            let htmlActividades = actsDelDia.length > 0 
                ? actsDelDia.map(a => `<div class="flex justify-between items-center bg-white p-2 rounded border border-gray-100 text-xs mb-1"><span class="text-gray-700 font-medium">${a.nombre_actividad}</span><span class="text-[10px] text-gray-400">${a.hora || ''}</span></div>`).join('')
                : '<p class="text-[11px] text-gray-400 italic">Keine Einträge.</p>';
            divDia.innerHTML = `<div class="flex justify-between items-center mb-1.5"><h3 class="font-bold text-gray-800 text-xs uppercase text-indigo-600">${nombreDia} (${diaActual.toLocaleDateString('de-DE')})</h3><span class="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">${actsDelDia.length} Eintr.</span></div><div class="space-y-1">${htmlActividades}</div>`;
            contenedorResultadosConsulta.appendChild(divDia);
        });
    }

    function renderizarVistaMensualModal(registros) {
        contenedorResultadosConsulta.innerHTML = '';
        if (registros.length === 0) { contenedorResultadosConsulta.innerHTML = '<p class="text-xs text-gray-400 text-center py-8">Keine Aktivitäten in diesem Monat.</p>'; return; }
        const agrupados = {};
        registros.forEach(r => { if (!agrupados[r.fecha]) agrupados[r.fecha] = []; agrupados[r.fecha].push(r); });
        Object.keys(agrupados).sort().forEach(fecha => {
            const acts = agrupados[fecha];
            const divFecha = document.createElement('div');
            divFecha.className = 'bg-gray-50 border border-gray-200 rounded-lg p-2.5';
            const fechaFormateada = new Date(fecha + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            let htmlActs = acts.map(a => `<div class="flex justify-between items-center bg-white p-2 rounded border border-gray-100 text-xs mb-1"><span class="text-gray-700 font-medium">${a.nombre_actividad}</span><span class="text-[10px] text-gray-400">${a.hora || ''}</span></div>`).join('');
            divFecha.innerHTML = `<div class="flex justify-between items-center mb-1.5"><h3 class="font-bold text-gray-800 text-xs capitalize text-indigo-600">${fechaFormateada}</h3><span class="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">${acts.length} Eintr.</span></div><div class="space-y-1">${htmlActs}</div>`;
            contenedorResultadosConsulta.appendChild(divFecha);
        });
    }

    btnAnteriorConsulta.addEventListener('click', () => {
        if (selectVistaConsulta.value === 'semanal') fechaActualPivote.setDate(fechaActualPivote.getDate() - 7);
        else fechaActualPivote.setMonth(fechaActualPivote.getMonth() - 1);
        consultarDatosModal();
    });
    btnSiguienteConsulta.addEventListener('click', () => {
        if (selectVistaConsulta.value === 'semanal') fechaActualPivote.setDate(fechaActualPivote.getDate() + 7);
        else fechaActualPivote.setMonth(fechaActualPivote.getMonth() + 1);
        consultarDatosModal();
    });
    selectUsuarioConsulta.addEventListener('change', consultarDatosModal);
    selectVistaConsulta.addEventListener('change', () => { fechaActualPivote = new Date(); consultarDatosModal(); });
}