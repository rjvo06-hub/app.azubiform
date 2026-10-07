import { SUPABASE_URL, headers } from './config.js';

export function inicializarAuth(onLoginExitoso) {
    const loginSection = document.getElementById('loginSection');
    const loginMensaje = document.getElementById('loginMensaje');
    const tituloAuth = document.getElementById('tituloAuth');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegistro = document.getElementById('tabRegistro');
    const formLogin = document.getElementById('formLogin');
    const formRegistro = document.getElementById('formRegistro');
    const selectTipoPrograma = document.getElementById('regTipoPrograma'); 
    const selectAusbildung = document.getElementById('regAusbildung'); 
    const contenedorFachrichtung = document.getElementById('contenedorFachrichtung');
    const labelFachrichtung = document.getElementById('labelRegFachrichtung');

    if (selectTipoPrograma) {
        selectTipoPrograma.addEventListener('change', (e) => {
            const tipoSeleccionado = e.target.value;
            
            if (tipoSeleccionado) {
                if (contenedorFachrichtung) contenedorFachrichtung.classList.remove('hidden');
                if (selectAusbildung) selectAusbildung.setAttribute('required', 'required');

                if (labelFachrichtung) {
                    if (tipoSeleccionado === 'fos') {
                        labelFachrichtung.textContent = "FOS-Fachrichtung (Fachbereich)";
                    } else {
                        labelFachrichtung.textContent = "Fachrichtung / Beruf";
                    }
                }

                cargarProfesionesPorTipo(tipoSeleccionado);
            } else {
                if (contenedorFachrichtung) contenedorFachrichtung.classList.add('hidden');
                if (selectAusbildung) selectAusbildung.removeAttribute('required');
            }
        });
    }

    function generarToken() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    async function cargarProfesionesPorTipo(tipo) {
        if (!selectAusbildung) return;
        try {
            const responseUrl = `${SUPABASE_URL}/rest/v1/profesions?tipo=eq.${tipo}&select=*`;
            const res = await fetch(responseUrl, {
                method: 'GET',
                headers: headers
            });

            if (!res.ok) {
                selectAusbildung.innerHTML = '<option value="" disabled>Fehler beim Laden</option>';
                return;
            }
            
            const data = await res.json();
            selectAusbildung.innerHTML = '<option value="" disabled selected>-- Wähle deine Option --</option>';

            if (data && data.length > 0) {
                data.forEach((prof) => {
                    const option = document.createElement('option');
                    option.value = prof.codigo; 
                    option.textContent = prof.nombre_oficial || prof.codigo;
                    selectAusbildung.appendChild(option);
                });
            } else {
                selectAusbildung.innerHTML = '<option value="" disabled>Keine Einträge gefunden</option>';
            }
        } catch (error) {
            console.error('Excepción:', error);
            if (selectAusbildung) {
                selectAusbildung.innerHTML = '<option value="" disabled>Netzwerkfehler</option>';
            }
        }
    }

    // EXPONER GLOBALMENTE PARA QUE FUNCIONE EL ONCLICK DEL HTML
    window.cambiarTab = function(tipo) {
        if (!loginMensaje) return;
        loginMensaje.classList.add('hidden');
        if (tipo === 'login') {
            if (tabLogin) tabLogin.className = "w-1/2 pb-2 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 focus:outline-none transition";
            if (tabRegistro) tabRegistro.className = "w-1/2 pb-2 text-sm font-semibold text-gray-400 border-b-2 border-transparent hover:text-gray-600 focus:outline-none transition";
            if (formLogin) formLogin.classList.remove('hidden');
            if (formRegistro) formRegistro.classList.add('hidden');
            if (tituloAuth) tituloAuth.textContent = "Anmelden";
            if (formLogin) formLogin.reset();
        } else {
            if (tabRegistro) tabRegistro.className = "w-1/2 pb-2 text-sm font-bold text-amber-600 border-b-2 border-amber-600 focus:outline-none transition";
            if (tabLogin) tabLogin.className = "w-1/2 pb-2 text-sm font-semibold text-gray-400 border-b-2 border-transparent hover:text-gray-600 focus:outline-none transition";
            if (formRegistro) formRegistro.classList.remove('hidden');
            if (formLogin) formLogin.classList.add('hidden');
            if (tituloAuth) tituloAuth.textContent = "Neuen Benutzer registrieren";
            if (formRegistro) formRegistro.reset();
            
            if (contenedorFachrichtung) contenedorFachrichtung.classList.add('hidden');
            if (selectAusbildung) {
                selectAusbildung.removeAttribute('required');
                selectAusbildung.innerHTML = '<option value="" disabled selected>-- Wähle deine Option --</option>';
            }
            if (labelFachrichtung) {
                labelFachrichtung.textContent = "Fachrichtung / Beruf";
            }
        }
    };

    window.togglePassword = function(idInput, idIcono) {
        const input = document.getElementById(idInput);
        const icono = document.getElementById(idIcono);
        if (!input || !icono) return;
        if (input.type === 'password') {
            input.type = 'text';
            icono.textContent = '🔒';
        } else {
            input.type = 'password';
            icono.textContent = '👁️';
        }
    };

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            if (loginMensaje) loginMensaje.classList.add('hidden');

            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?email=ilike.${encodeURIComponent(email)}`, {
                    method: 'GET', 
                    headers: headers
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

                if (!usuarioExistente.verificado) {
                    mostrarMensaje('⚠ Bitte bestätige zuerst deine E-Mail-Adresse über den Link in deinem Postfach.');
                    return;
                }

                localStorage.setItem('usuario_actual', usuarioExistente.nombre);
                localStorage.setItem('usuario_ausbildung', usuarioExistente.ausbildung || '');
                localStorage.setItem('usuario_acceso', usuarioExistente.acceso ? Number(usuarioExistente.acceso) : 0);
                
                onLoginExitoso(usuarioExistente.nombre);
            } catch (error) {
                mostrarMensaje('❌ Netzwerkfehler (Prüfe deine mobile Verbindung): ' + error.message);
            }
        });
    }

    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('regNombre').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const ausbildung = document.getElementById('regAusbildung').value.trim(); 
            const password = document.getElementById('regPassword').value;
            const passwordConfirm = document.getElementById('regPasswordConfirm').value;
            if (loginMensaje) loginMensaje.classList.add('hidden');

            if (password !== passwordConfirm) {
                mostrarMensaje('❌ Die Passwörter stimmen nicht überein.');
                return;
            }

            try {
                const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?email=ilike.${encodeURIComponent(email)}`, {
                    method: 'GET', 
                    headers: headers
                });
                if (!checkRes.ok) throw new Error('Fehler bei der Überprüfung der E-Mail.');
                
                const existingUsers = await checkRes.json();
                if (existingUsers.length > 0) {
                    mostrarMensaje('❌ Diese E-Mail-Adresse ist bereits registriert.');
                    return;
                }

                const token = generarToken();

                const resUser = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
                    method: 'POST', 
                    headers: headers,
                    body: JSON.stringify({ 
                        nombre: nombre, 
                        email: email, 
                        ausbildung: ausbildung, 
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

                window.cambiarTab('login');
                mostrarMensaje('✅ Registrierung erfolgreich! Bitte überprüfe deinen Posteingang, um dein Konto zu aktivieren.', 'exito');
                
                const loginEmailInput = document.getElementById('loginEmail');
                if (loginEmailInput) {
                    loginEmailInput.value = email;
                }

            } catch (error) {
                mostrarMensaje('❌ Netzwerkfehler auf Mobilfunknetz: ' + error.message);
            }
        });
    }

    function mostrarMensaje(texto, tipo = 'error') {
        if (!loginMensaje) return;
        loginMensaje.textContent = texto;
        if (tipo === 'exito') {
            loginMensaje.className = 'text-xs text-center py-2 mt-3 rounded-lg font-medium bg-emerald-100 text-emerald-700';
        } else {
            loginMensaje.className = 'text-xs text-center py-2 mt-3 rounded-lg font-medium bg-red-100 text-red-700';
        }
        loginMensaje.classList.remove('hidden');
    }
}
