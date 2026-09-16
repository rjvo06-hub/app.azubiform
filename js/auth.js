import { SUPABASE_URL, headers, CODIGO_MAESTRO } from './config.js';

export function inicializarAuth(onLoginExitoso) {
    const loginSection = document.getElementById('loginSection');
    const loginMensaje = document.getElementById('loginMensaje');
    const tituloAuth = document.getElementById('tituloAuth');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegistro = document.getElementById('tabRegistro');
    const formLogin = document.getElementById('formLogin');
    const formRegistro = document.getElementById('formRegistro');

    window.cambiarTab = function(tipo) {
        loginMensaje.classList.add('hidden');
        if (tipo === 'login') {
            tabLogin.className = "w-1/2 pb-2 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 focus:outline-none transition";
            tabRegistro.className = "w-1/2 pb-2 text-sm font-semibold text-gray-400 border-b-2 border-transparent hover:text-gray-600 focus:outline-none transition";
            formLogin.classList.remove('hidden');
            formRegistro.classList.add('hidden');
            tituloAuth.textContent = "Anmelden";
        } else {
            tabRegistro.className = "w-1/2 pb-2 text-sm font-bold text-amber-600 border-b-2 border-amber-600 focus:outline-none transition";
            tabLogin.className = "w-1/2 pb-2 text-sm font-semibold text-gray-400 border-b-2 border-transparent hover:text-gray-600 focus:outline-none transition";
            formRegistro.classList.remove('hidden');
            formLogin.classList.add('hidden');
            tituloAuth.textContent = "Neuen Benutzer registrieren";
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
            if (usuarioExistente.password === password) {
                localStorage.setItem('usuario_actual', usuarioExistente.nombre);
                onLoginExitoso(usuarioExistente.nombre);
            } else {
                mostrarMensaje('❌ Falsches Passwort.');
            }
        } catch (error) {
            mostrarMensaje('❌ Netzwerkfehler: ' + error.message);
        }
    });

    formRegistro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('regNombre').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const codigoIngresado = document.getElementById('regCodigo').value.trim();
        loginMensaje.classList.add('hidden');

        if (codigoIngresado !== CODIGO_MAESTRO) {
            mostrarMensaje('❌ Ungültiger Sicherheitscode.');
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

            await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
                method: 'POST', headers: headers,
                body: JSON.stringify({ nombre: nombre, email: email, password: password })
            });

            localStorage.setItem('usuario_actual', nombre);
            onLoginExitoso(nombre);
        } catch (error) {
            mostrarMensaje('❌ Netzwerkfehler: ' + error.message);
        }
    });

    function mostrarMensaje(texto) {
        loginMensaje.textContent = texto;
        loginMensaje.className = 'text-xs text-center py-2 mt-3 rounded-lg font-medium bg-red-100 text-red-700';
        loginMensaje.classList.remove('hidden');
    }
}
