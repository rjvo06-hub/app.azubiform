if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('regNombre').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const ausbildung = document.getElementById('regAusbildung').value.trim(); 
            
            // 1. CAPTURAR CORRECTAMENTE EL TIPO DE PROGRAMA SELECCIONADO
            const selectTipo = document.getElementById('regTipoPrograma');
            const tipoPrograma = selectTipo ? selectTipo.value.trim().toLowerCase() : '';
            
            console.log("Programa seleccionado en el formulario:", tipoPrograma); // Esto saldrá en F12 -> Console

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

                // 2. SELECCIÓN DINÁMICA DEL ENDPOINT DE CORREO
                // Si el valor contiene 'fos', usa el archivo de FOS; de lo contrario, el de Ausbildung
                const endpointCorreo = (tipoPrograma.includes('fos')) ? '/api/send-fos-email' : '/api/enviar-correo';
                console.log("Endpoint de correo que se va a invocar:", endpointCorreo);

                const emailRes = await fetch(endpointCorreo, {
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
