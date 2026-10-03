// ==========================================
// AZUBIFORM - SCRIPT PRINCIPAL & AUTENTICACIÓN
// ==========================================

// Configuración de Supabase (Asegúrate de que coincida con tus credenciales)
const SUPABASE_URL = 'TU_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY';

// Inicializar cliente de Supabase si está disponible globalmente
let supabaseClient = null;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificación de sesión al cargar para evitar loops de login
    await verificarSesionYUsuario();
    
    // 2. Inicializar funciones de la interfaz y voz
    initSpeechRecognitionSetup();
});

/**
 * Verifica si el usuario ha iniciado sesión en Supabase y recupera su Ausbildung.
 */
async function verificarSesionYUsuario() {
    if (!supabaseClient) return;

    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error || !session) {
            // Si no hay sesión y no estamos ya en la página de login, redirigir
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
            return;
        }

        // Usuario autenticado: recuperar su perfil y su Ausbildung real
        const userId = session.user.id;
        const { data: perfil, error: perfilError } = await supabaseClient
            .from('usuarios') // O la tabla donde guardes el perfil del usuario (ej. ausbildung)
            .select('ausbildung, nombre, username')
            .eq('id', userId)
            .single();

        if (perfil && perfil.ausbildung) {
            // Guardar en localStorage para que las actividades nuevas usen esto y NO 'empty'
            localStorage.setItem('usuario_ausbildung', perfil.ausbildung);
            console.log("Ausbildung del usuario cargado correctamente:", perfil.ausbildung);
        } else {
            // Valor de respaldo seguro si no se encuentra en la base de datos
            localStorage.setItem('usuario_ausbildung', 'Gärtner');
        }

    } catch (e) {
        console.error("Error al verificar la sesión del usuario:", e);
    }
}

// ==========================================
// RECONOCIMIENTO DE VOZ
// ==========================================

let recognition = null;
let isListening = false;
let shouldBeListening = false;

function initSpeechRecognitionSetup() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn("El reconocimiento de voz no es compatible con este navegador.");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
        isListening = true;
    };

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
        }
        
        const activeInput = document.getElementById('descripcionActividad') || document.getElementById('textoTranscripcion');
        if (activeInput) {
            activeInput.value = transcript;
            activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };

    recognition.onerror = (event) => {
        console.error("Error en el reconocimiento de voz:", event.error);
        isListening = false;
    };

    recognition.onend = () => {
        isListening = false;
        if (shouldBeListening && document.visibilityState === 'visible') {
            try {
                recognition.start();
            } catch (e) {
                console.error("No se pudo reiniciar automáticamente el reconocimiento:", e);
            }
        }
    };
}

/**
 * Función para alternar la escucha desde el botón de la interfaz.
 */
function toggleVoiceInput() {
    if (!recognition) {
        alert("El reconocimiento de voz no está disponible en este dispositivo.");
        return;
    }

    const btnMicrofono = document.getElementById('btnMicrofono');

    if (isListening) {
        shouldBeListening = false;
        recognition.stop();
        if (btnMicrofono) btnMicrofono.classList.remove('activo', 'pulse-rojo');
    } else {
        shouldBeListening = true;
        try {
            recognition.start();
            if (btnMicrofono) btnMicrofono.classList.add('activo', 'pulse-rojo');
        } catch (e) {
            console.error("Error al intentar iniciar la escucha:", e);
            shouldBeListening = false;
        }
    }
}

// ==========================================
// CONTROL DE VISIBILIDAD
// ==========================================
document.addEventListener('visibilitychange', () => {
    const btnMicrofono = document.getElementById('btnMicrofono');

    if (document.visibilityState === 'hidden') {
        if (isListening && recognition) {
            try {
                recognition.stop();
            } catch (e) {
                console.error("Error al detener por cambio de visibilidad:", e);
            }
        }
    } else if (document.visibilityState === 'visible') {
        if (shouldBeListening && recognition && !isListening) {
            setTimeout(() => {
                try {
                    recognition.start();
                    if (btnMicrofono) btnMicrofono.classList.add('activo', 'pulse-rojo');
                } catch (e) {
                    console.error("Error al reanudar tras volver a la app:", e);
                    shouldBeListening = false;
                    if (btnMicrofono) btnMicrofono.classList.remove('activo', 'pulse-rojo');
                }
            }, 400);
        }
    }
});
