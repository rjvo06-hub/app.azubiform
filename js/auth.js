// ==========================================
// MÓDULO DE AUTENTICACIÓN Y REGISTRO (auth.js)
// ==========================================

// Exportamos la función que tu index.html está exigiendo
export function inicializarAuth() {
    const registroForm = document.getElementById('registro-form');
    const selectProfesion = document.getElementById('ausbildung-select');

    // Cargar las profesiones de Supabase al iniciar
    if (selectProfesion) {
        cargarProfesiones();
    }

    if (registroForm) {
        registroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const nombreInput = document.getElementById('nombre');
            const profesionSelect = document.getElementById('ausbildung-select');

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';
            const nombre = nombreInput ? nombreInput.value.trim() : '';
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

                alert('Registrierung erfolgreich!');
                registroForm.reset();

            } catch (err) {
                console.error('Fehler:', err.message);
                alert('Fehler: ' + err.message);
            }
        });
    }
}

async function cargarProfesiones() {
    const selectProfesion = document.getElementById('ausbildung-select');
    if (!selectProfesion) return;

    try {
        // Consultando la tabla 'profesions' de tu Supabase
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

// Funciones globales para los eventos onclick del HTML
window.cambiarTab = function(tabName) {
    const loginSec = document.getElementById('login-section');
    const regSec = document.getElementById('registro-section');
    if (loginSec && regSec) {
        if (tabName === 'login') {
            loginSec.style.display = 'block';
            regSec.style.display = 'none';
        } else {
            loginSec.style.display = 'none';
            regSec.style.display = 'block';
        }
    }
};

window.togglePassword = function(id) {
    const input = document.getElementById(id);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
};
