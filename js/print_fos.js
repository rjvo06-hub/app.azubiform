import { SUPABASE_URL, headers } from './config.js';

export async function inicializarVistaPreviaSemanasFos(containerId, usuarioPreseleccionado = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. Renderizado inicial del HTML (se mantiene igual que tu estructura)
    container.innerHTML = `... [Tu estructura HTML del panel y modal] ...`;

    const estadoInfoModal = document.getElementById('fosEstadoInfoModal');
    const selectSemanaModal = document.getElementById('fosSelectSemanaModal');
    const fosResNombre = document.getElementById('fosResNombre');
    const fosResClase = document.getElementById('fosResClase');
    const fosResProfesion = document.getElementById('fosResProfesion');
    const fosResWorkplace = document.getElementById('fosResWorkplace');
    const fosResProfesora = document.getElementById('fosResProfesora');
    const fosLblSemanaActual = document.getElementById('fosLblSemanaActual');

    // Definir una única fuente de verdad para el usuario actual
    let nombreUsuarioActual = usuarioPreseleccionado || localStorage.getItem('usuario_actual');
    if (!nombreUsuarioActual) {
        estadoInfoModal.textContent = "❌ No se encontró un usuario activo.";
        return;
    }
    fosResNombre.textContent = nombreUsuarioActual;

    let archivoPdfOriginalBytes = null;
    let coordenadasMap = {};
    let semanasAgrupadas = {};
    let pdfDoc = null;
    let pageViewport = null;
    let scale = 1.0;

    try {
        estadoInfoModal.textContent = "⏳ Sincronizando datos desde Supabase...";

        // 🚀 OPTIMIZACIÓN 1: Consulta unificada y paralela a Supabase usando Promise.all
        // Hacemos el fetch del usuario y de sus registros diarios al mismo tiempo para ganar velocidad.
        const [respUsuario, respReg] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/usuarios?nombre=eq.${encodeURIComponent(nombreUsuarioActual)}&select=*`, { headers: { ...headers, 'Range': '0-0' } }),
            fetch(`${SUPABASE_URL}/rest/v1/registro_diario?usuario=eq.${encodeURIComponent(nombreUsuarioActual)}&select=*`, { headers: { ...headers, 'Range': '0-999' } })
        ]);

        if (!respUsuario.ok) throw new Error("Error al consultar el perfil del usuario.");
        const dataUsr = await respUsuario.json();
        if (dataUsr.length === 0) throw new Error("Usuario no encontrado en la base de datos.");

        const usuario = dataUsr[0];
        const escuelaId = usuario.file_identifier || usuario.school_name || usuario.escuela || 'fos_holzkirchen';
        const claseUsuario = usuario.class || usuario.klasse || '-';
        const workplaceUsuario = usuario.workplace || usuario.betrieb || '-';
        const profesoraUsuario = usuario.teacher || '-'; // Fuente única de verdad desde la BD
        const codigoProfesion = usuario.ausbildung;

        // 🚀 OPTIMIZACIÓN 2: Consultas secundarias paralelas (Profesión y Plantilla de la escuela)
        const [respProf, respTpl] = await Promise.all([
            codigoProfesion 
                ? fetch(`${SUPABASE_URL}/rest/v1/profesions?codigo=eq.${encodeURIComponent(codigoProfesion)}&select=*`, { headers: { ...headers, 'Range': '0-0' } })
                : Promise.resolve(null),
            fetch(`${SUPABASE_URL}/rest/v1/school_templates?file_identifier=eq.${encodeURIComponent(escuelaId)}&select=*`, { headers: { ...headers, 'Range': '0-0' } })
        ]);

        // Procesar Profesión
        let profesionUsuario = codigoProfesion || '-';
        if (respProf && respProf.ok) {
            const dataProf = await respProf.json();
            if (dataProf.length > 0) {
                profesionUsuario = dataProf[0].nombre_oficial || dataProf[0].codigo || codigoProfesion;
            }
        }

        // Procesar Coordenadas de la Plantilla
        if (respTpl && respTpl.ok) {
            const tplData = await respTpl.json();
            if (tplData.length > 0) {
                coordenadasMap = tplData[0].coordinates_json || {};
            }
        }

        // Procesar Registros Diarios y Semanas
        if (respReg.ok) {
            const registrosGlobales = await respReg.json();
            semanasAgrupadas = agruparRegistrosPorSemana(registrosGlobales);

            selectSemanaModal.innerHTML = '<option value="">-- Selecciona una semana --</option>';
            Object.keys(semanasAgrupadas).forEach(sem => {
                const opt = document.createElement('option');
                opt.value = sem;
                opt.textContent = `Woche: ${sem}`;
                selectSemanaModal.appendChild(opt);
            });
        }

        // Pintar los datos limpios en la interfaz
        fosResClase.textContent = claseUsuario;
        fosResProfesion.textContent = profesionUsuario;
        fosResWorkplace.textContent = workplaceUsuario;
        fosResProfesora.textContent = profesoraUsuario;

        estadoInfoModal.textContent = "✅ Datos sincronizados. Sube o carga la plantilla PDF para comenzar.";

    } catch (err) {
        console.error("Error en la sincronización:", err);
        estadoInfoModal.textContent = `❌ ${err.message || "Error al conectar con Supabase."}`;
    }

    // ... [El resto de tus event listeners para el input del PDF, canvas, modal y descarga se mantienen limpios aquí]
}
