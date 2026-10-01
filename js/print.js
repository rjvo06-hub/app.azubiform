import { SUPABASE_URL, headers } from './config.js';

export function inicializarImpresion() {
    const modalImpresionAusbildung = document.getElementById('modalImpresionAusbildung');
    const selectUsuarioImpresion = document.getElementById('selectUsuarioImpresion');
    const lblSemanaImpresion = document.getElementById('lblSemanaImpresion');
    let fechaPivoteImpresion = new Date();

    window.abrirModalImpresionAusbildung = async function() {
        modalImpresionAusbildung.classList.remove('hidden');
        fechaPivoteImpresion = new Date();
        await cargarUsuariosEnSelectImpresion(selectUsuarioImpresion, cargarDatosHojaImpresion);
    };

    window.cerrarModalImpresionAusbildung = function() {
        modalImpresionAusbildung.classList.add('hidden');
    };

    window.cambiarSemanaImpresion = function(direccion) {
        fechaPivoteImpresion.setDate(fechaPivoteImpresion.getDate() + (direccion * 7));
        cargarDatosHojaImpresion();
    };

    async function cargarUsuariosEnSelectImpresion(elementoSelect, callbackDespues) {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?select=nombre,email`, { headers });
            const usuarios = await res.json();
            elementoSelect.innerHTML = '<option value="">-- Selecciona --</option>';
            usuarios.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.nombre;
                opt.textContent = u.nombre;
                elementoSelect.appendChild(opt);
            });
            const usuarioActual = localStorage.getItem('usuario_actual');
            if (usuarioActual) elementoSelect.value = usuarioActual;
            else if (usuarios.length > 0) elementoSelect.value = usuarios[0].nombre;
            if (callbackDespues) callbackDespues();
        } catch (err) { console.error(err); }
    }

    function obtenerRangoSemana(d) {
        const fecha = new Date(d);
        const day = fecha.getDay();
        const diff = fecha.getDate() - day + (day === 0 ? -6 : 1);
        const lunes = new Date(fecha.setDate(diff));
        lunes.setHours(0, 0, 0, 0);
        
        const viernes = new Date(lunes);
        viernes.setDate(lunes.getDate() + 4);
        viernes.setHours(23, 59, 59, 999);
        
        return { lunes, viernes };
    }

    function formatearISO(date) { 
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`; 
    }

    function formatearDDMM(fecha) {
        const d = fecha.getDate().toString().padStart(2, '0');
        const m = (fecha.getMonth() + 1).toString().padStart(2, '0');
        return `${d}.${m}`;
    }
    
    function formatearYY(fecha) { return fecha.getFullYear().toString().slice(-2); }

    async function cargarDatosHojaImpresion() {
        const usuario = selectUsuarioImpresion.value;
        if (!usuario) return;

        const { lunes, viernes } = obtenerRangoSemana(fechaPivoteImpresion);
        lblSemanaImpresion.textContent = `${lunes.toLocaleDateString('es-ES')} al ${viernes.toLocaleDateString('es-ES')}`;

        const elNombre = document.getElementById('pr_nombre');
        const elSemanaInicio = document.getElementById('pr_semana_inicio');
        const elSemanaFin = document.getElementById('pr_semana_fin');
        const elAnoFin = document.getElementById('pr_ano_fin');
        
        if (elNombre) elNombre.textContent = usuario;
        if (elSemanaInicio) elSemanaInicio.textContent = formatearDDMM(lunes);
        if (elSemanaFin) elSemanaFin.textContent = formatearDDMM(viernes);
        if (elAnoFin) elAnoFin.textContent = formatearYY(viernes);

        const prefijosDias = ['m', 'di', 'mi', 'do', 'fr'];
        prefijosDias.forEach(prefijo => {
            for (let i = 1; i <= 6; i++) {
                const el = document.getElementById(`pr_${prefijo}${i}`);
                if (el) {
                    el.textContent = '';
                    el.style.whiteSpace = 'nowrap';
                    el.style.overflow = 'hidden';
                    el.style.textOverflow = 'ellipsis';
                }
            }
        });

        try {
            const urlQuery = `${SUPABASE_URL}/rest/v1/registro_diario?usuario=eq.${encodeURIComponent(usuario)}&fecha=gte.${formatearISO(lunes)}&fecha=lte.${formatearISO(viernes)}&order=fecha.asc,hora.asc`;
            const res = await fetch(urlQuery, { headers });
            const registros = await res.json();

            const mapeoDias = { 0: 'm', 1: 'di', 2: 'mi', 3: 'do', 4: 'fr' };
            const lineasPorDia = { m: [], di: [], mi: [], do: [], fr: [] };

            registros.forEach(reg => {
                const [anio, mes, dia] = reg.fecha.split('-').map(Number);
                const fechaReg = new Date(anio, mes - 1, dia);
                
                let dIndex = fechaReg.getDay() - 1; // Lunes=0 ... Viernes=4
                
                if (dIndex >= 0 && dIndex <= 4) {
                    const claveDia = mapeoDias[dIndex];
                    if (lineasPorDia[claveDia].length < 6) {
                        lineasPorDia[claveDia].push(reg.nombre_actividad);
                    }
                }
            });

            Object.keys(lineasPorDia).forEach(claveDia => {
                const listaActividadesDia = lineasPorDia[claveDia];
                listaActividadesDia.forEach((textoActividad, index) => {
                    const numeroLinea = index + 1;
                    const el = document.getElementById(`pr_${claveDia}${numeroLinea}`);
                    if (el) {
                        el.textContent = textoActividad;
                    }
                });
            });

        } catch (err) {
            console.error("Error al cargar datos de impresión:", err);
        }
    }

    selectUsuarioImpresion.addEventListener('change', cargarDatosHojaImpresion);
}
