import { SUPABASE_URL, headers } from './config.js';

export function inicializarAuth(onLoginExitoso) {
    const loginSection = document.getElementById('loginSection');
    const loginMensaje = document.getElementById('loginMensaje');
    const tituloAuth = document.getElementById('tituloAuth');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegistro = document.getElementById('tabRegistro');
    const formLogin = document.getElementById('formLogin');
    const formRegistro = document.getElementById('formRegistro');

    function generarToken() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    window.cambiarTab = function(tipo) {
        loginMensaje.classList.add('hidden');
        if (tipo === 'login') {
            tabLogin.className = "w-1/2 pb-2 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 focus:outline-none transition";
            tabRegistro.className = "w-1/2 pb-2 text-sm font-semibold text-gray-400 border-b-2 border-transparent hover:text-gray-600 focus:outline-none transition";
            formLogin.classList.remove('hidden');
            formRegistro.classList.add('hidden');
            tituloAuth.textContent = "Anmelden";
            formLogin.reset();
        } else {
            tabRegistro.className = "w-1/2 pb-2 text-sm font-bold text-amber-600 border-b-2 border-amber-600 focus:outline-none transition";
            tabLogin.className = "w-1/2 pb-2 text-sm font-semibold text-gray-400 border-b-2 border-transparent hover:text-gray-600 focus:outline-none transition";
            formRegistro.classList.remove('hidden');
            formLogin.classList.add('hidden');
            tituloAuth.textContent = "Neuen Benutzer registrieren";
            formRegistro.reset();
        }
    };

    window.togglePassword = function(idInput, idIcono) {
        const input = document.getElementById(idInput);
        const icono = document.getElementById(idIcono);
        if (input.type === 'password') {
            input.type = 'text';
            icono.textContent = '🔒';
        } else {
            input.type = 'password';
            icono.textContent = '👁️';
        }
    };

    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        loginMensaje.classList.add('hidden');

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?email=eq.${encodeURIComponent(email)}`, {
                method: 'GET', headers: headers
            });
            if (!response.ok) throw new Error('Fehler beim Verbinden mit der Datenbank');
            const usuarios = await response.json();
            if (usuarios.length === 0) {
                mostrarMensaje('❌ Diese E-Mail-Adresse ist nicht registriert.');
                return;
            }
            const usuarioExistente = usuarios[0];
            if (usuarioExistente.password !== password) {
                mostrarMensaje('❌ Falsches Passwort.');
                return;
            }

            // Validar si confirmó su correo
            if (!usuarioExistente.verificado) {
                mostrarMensaje('⚠️ Bitte bestätige zuerst deine E-Mail-Adresse über den Link in deinem Postfach.');
                return;
            }

            localStorage.setItem('usuario_actual', usuarioExistente.nombre);
            localStorage.setItem('usuario_acceso', usuarioExistente.acceso ? Number(usuarioExistente.acceso) : 0);
            
            onLoginExitoso(usuarioExistente.nombre);
        } catch (error) {
            mostrarMensaje('❌ Netzwerkfehler: ' + error.message);
        }
    });

    formRegistro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('regNombre').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const passwordConfirm = document.getElementById('regPasswordConfirm').value;
        loginMensaje.classList.add('hidden');

        if (password !== passwordConfirm) {
            mostrarMensaje('❌ Die Passwörter stimmen nicht überein.');
            return;
        }

        try {
            const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?email=eq.${encodeURIComponent(email)}`, {
                method: 'GET', headers: headers
            });
            const existingUsers = await checkRes.json();
            if (existingUsers.length > 0) {
                mostrarMensaje('❌ Diese E-Mail-Adresse ist bereits registriert.');
                return;
            }

            const token = generarToken();

            const resUser = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
                method: 'POST', headers: headers,
                body: JSON.stringify({ 
                    nombre: nombre, 
                    email: email, 
                    password: password, 
                    verificado: false, 
                    token_verificacion: token,
                    acceso: null 
                })
            });

            if (!resUser.ok) {
                mostrarMensaje('❌ Fehler beim Erstellen des Benutzerkontos.');
                return;
            }

            const emailRes = await fetch('/api/enviar-correo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, nombre, token })
            });

            if (!emailRes.ok) {
                mostrarMensaje('⚠ Konto erstellt, aber Fehler beim Senden der Bestätigungs-E-Mail.');
                return;
            }

            // MODIFICACIÓN APLICADA: 
            // 1. Cambiar automáticamente a la pestaña de login ("Ich habe bereits ein Konto")
            window.cambiarTab('login');

            // 2. Mostrar el mensaje de éxito ya posicionados en la pestaña de inicio de sesión
            mostrarMensaje('✅ Registrierung erfolgreich! Bitte überprüfe deinen Posteingang, um dein Konto zu aktivieren.', 'exito');
            
            // 3. Autocompletar el correo en el formulario de inicio de sesión para comodidad
            const loginEmailInput = document.getElementById('loginEmail');
            if (loginEmailInput) {
                loginEmailInput.value = email;
            }

        } catch (error) {
            mostrarMensaje('❌ Netzwerkfehler: ' + error.message);
        }
    });

    function mostrarMensaje(texto, tipo = 'error') {
        loginMensaje.textContent = texto;
        if (tipo === 'exito') {
            loginMensaje.className = 'text-xs text-center py-2 mt-3 rounded-lg font-medium bg-emerald-100 text-emerald-700';
        } else {
            loginMensaje.className = 'text-xs text-center py-2 mt-3 rounded-lg font-medium bg-red-100 text-red-700';
        }
        loginMensaje.classList.remove('hidden');
    }
}
