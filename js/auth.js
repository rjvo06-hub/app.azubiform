// ==========================================
// MÓDULO DE AUTENTICACIÓN Y REGISTRO (auth.js)
// ==========================================

// Función principal que se importa o llama desde el HTML
export function inicializarAuth() {
    const registroForm = document.getElementById('registro-form');
    const loginForm = document.getElementById('login-form');
    const selectProfesion = document.getElementById('ausbildung-select');

    // Cargar las profesiones de Supabase al iniciar si el select existe
    if (selectProfesion) {
        cargarProfesiones();
    }

    // Manejar el evento de registro
    if (registroForm) {
        registroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nombreInput = document.getElementById('nombre') || document.querySelector('input[type="text"]');
            const emailInput = document.getElementById('email') || document.querySelector('input[type="email"]');
            const passwordInput = document.getElementById('password') || document.querySelector('input[type="password"]');
            const profesionSelect = document.getElementById('ausbildung-select');

            const nombre = nombreInput ? nombreInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';
            const profesion = profesionSelect ? profesionSelect.value : '';

            if (!email || !password) {
                alert('Bitte fülle E-Mail und Passwort aus.');
                return;
            }

            try {
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            full_name: nombre,
                            profesion: profesion
                        }
                    }
                });

                if (error) throw error;

                alert('Registrierung erfolgreich! Bitte überprüfe deine E-Mails.');
                registroForm.reset();

            } catch (err) {
                console.error('Fehler bei der Registrierung:', err.message);
                alert('Fehler bei der Registrierung: ' + err.message);
            }
        });
    }
}

// Cargar dinámicamente las profesiones desde la tabla 'profesions' de Supabase
async function cargarProfesiones() {
    const selectProfesion = document.getElementById('ausbildung-select');
    if (!selectProfesion) return;

    try {
        const { data, error } = await supabase
            .from('profesions')
            .select('*');

        if (error) throw error;

        selectProfesion.innerHTML = '<option value="">Wähle deine Ausbildung...</option>';

        if (data && data.length > 0) {
            data.forEach((prof) => {
                const option = document.createElement('option');
                option.value = prof.id || prof.codigo || prof.nombre_largo; 
                option.textContent = prof.nombre_largo || prof.nombre || prof.titulo;
                selectProfesion.appendChild(option);
            });
        } else {
            selectProfesion.innerHTML = '<option value="">Keine Ausbildungen gefunden</option>';
        }

    } catch (err) {
        console.error('Fehler beim Laden der Ausbildungen:', err);
        selectProfesion.innerHTML = '<option value="">Fehler beim Laden</option>';
    }
}

// Funciones auxiliares expuestas globalmente para los eventos 'onclick' del HTML
window.cambiarTab = function(tabName) {
    // Lógica para cambiar entre pestañas de Login y Registro si tu app lo usa
    const loginTab = document.getElementById('login-section');
    const registroTab = document.getElementById('registro-section');
    if (loginTab && registroTab) {
        if (tabName === 'login') {
            loginTab.style.display = 'block';
            registroTab.style.display = 'none';
        } else {
            loginTab.style.display = 'none';
            registroTab.style.display = 'block';
        }
    }
};

window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
};

// Ejecutar inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    inicializarAuth();
});
