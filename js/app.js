// ==========================================
// AZUBIFORM - SCRIPT PRINCIPAL & RECONOCIMIENTO DE VOZ
// ==========================================

let recognition = null;
let isListening = false;
let shouldBeListening = false; // Bandera para rastrear la intención de grabación del usuario

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn("El reconocimiento de voz no es compatible con este navegador.");
        return null;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'de-DE';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => {
        isListening = true;
        console.log("Reconocimiento de voz iniciado correctamente.");
    };

    rec.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
        }
        
        // Actualiza dinámicamente el campo de texto activo o la descripción de la actividad
        const activeInput = document.getElementById('descripcionActividad') || document.getElementById('textoTranscripcion');
        if (activeInput) {
            activeInput.value = transcript;
            activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };

    rec.onerror = (event) => {
        console.error("Error en el reconocimiento de voz:", event.error);
        isListening = false;
    };

    rec.onend = () => {
        isListening = false;
        console.log("Reconocimiento de voz finalizado.");
        
        // Si la app sigue activa y el usuario no detuvo la grabación a propósito, reiniciamos automáticamente
        if (shouldBeListening && document.visibilityState === 'visible') {
            try {
                rec.start();
            } catch (e) {
                console.error("No se pudo reiniciar automáticamente el reconocimiento:", e);
            }
        }
    };

    return rec;
}

// Inicializar la instancia de voz al cargar el script
recognition = initSpeechRecognition();

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
// CONTROL DE VISIBILIDAD (Cambio de app / pestaña)
// ==========================================
document.addEventListener('visibilitychange', () => {
    const btnMicrofono = document.getElementById('btnMicrofono');

    if (document.visibilityState === 'hidden') {
        // Cuando el usuario cambia de app o minimiza, detenemos la escucha limpiamente para liberar el recurso
        if (isListening && recognition) {
            try {
                recognition.stop();
            } catch (e) {
                console.error("Error al detener por cambio de visibilidad:", e);
            }
        }
    } else if (document.visibilityState === 'visible') {
        // Al regresar a la app, si el usuario tenía la intención de grabar, reanudamos de forma segura
        if (shouldBeListening && recognition && !isListening) {
            setTimeout(() => {
                try {
                    recognition.start();
                    if (btnMicrofono) btnMicrofono.classList.add('activo', 'pulse-rojo');
                    console.log("Reanudada la escucha tras volver a la aplicación.");
                } catch (e) {
                    console.error("Error al reanudar tras volver a la app:", e);
                    shouldBeListening = false;
                    if (btnMicrofono) btnMicrofono.classList.remove('activo', 'pulse-rojo');
                }
            }, 400);
        }
    }
});
