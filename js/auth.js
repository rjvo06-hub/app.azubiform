import { SUPABASE_URL, headers } from './config.js';

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
            formLogin.reset(); // Limpia el formulario de login al cambiar
        } else {
            tabRegistro.className = "w-1/2 pb-2 text-sm font-bold text-amber-600 border-b-2 border-amber-600 focus:outline-none transition";
            tabLogin.className = "w-1/2 pb-2 text-sm font-semibold text-gray-400 border-b-2 border-transparent hover:text-gray-600 focus:outline-none transition";
            formRegistro.classList.remove('hidden');
            formLogin.classList.add('hidden');
            tituloAuth.textContent = "Neuen Benutzer registrieren";
            formRegistro.reset(); // Limpia el formulario de registro al cambiar
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
                localStorage.setItem('usuario_acceso', usuarioExistente.acceso ? Number(usuarioExistente.acceso) : 0);
                
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
        const adresse = document.getElementById('regAdresse').value.trim();
        const password = document.getElementById('regPassword').value;
        const codigoIngresado = document.getElementById('regCodigo').value.trim();
        loginMensaje.classList.add('hidden');

        try {
            // 1. Verificar si el código introducido existe y está disponible (usado = false)
            const resCodigo = await fetch(`${SUPABASE_URL}/rest/v1/codigos_invitacion?codigo=eq.${encodeURIComponent(codigoIngresado)}&usado=eq.false`, {
                method: 'GET', headers: headers
            });
            const codigosDisponibles = await resCodigo.json();

            if (!codigosDisponibles || codigosDisponibles.length === 0) {
                mostrarMensaje('❌ Ungültiger Sicherheitscode oder wurde bereits verwendet.');
                return;
            }

            const registroCodigo = codigosDisponibles[0];

            // 2. Validar si el correo ya está registrado en el sistema
            const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?email=eq.${encodeURIComponent(email)}`, {
                method: 'GET', headers: headers
            });
            const existingUsers = await checkRes.json();
            if (existingUsers.length > 0) {
                mostrarMensaje('❌ Diese E-Mail-Adresse ist bereits registriert.');
                return;
            }

            // 3. Marcar el código de invitación como usado para invalidarlo permanentemente
            const resUpdate = await fetch(`${SUPABASE_URL}/rest/v1/codigos_invitacion?id=eq.${registroCodigo.id}`, {
                method: 'PATCH',
                headers: { ...headers, 'Prefer': 'return=minimal' },
                body: JSON.stringify({ usado: true })
            });

            if (!resUpdate.ok) {
                mostrarMensaje('❌ Fehler beim Entwerten des Sicherheitscodes.');
                return;
            }

            // 4. Crear el nuevo usuario en la base de datos
            const resUser = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
                method: 'POST', headers: headers,
                body: JSON.stringify({ nombre: nombre, email: email, adresse: adresse, password: password, acceso: null })
            });

            if (!resUser.ok) {
                mostrarMensaje('❌ Fehler beim Erstellen des Benutzerkontos.');
                return;
            }

            localStorage.setItem('usuario_actual', nombre);
            localStorage.setItem('usuario_acceso', 0);
            
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
