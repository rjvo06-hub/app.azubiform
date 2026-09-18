import { SUPABASE_URL, headers } from './config.js';

export function inicializarGeneradorCodigos(esAdmin) {
    const panel = document.getElementById('panelGenerarCodigo');
    if (!panel) return;

    if (esAdmin) {
        panel.classList.remove('hidden');
    } else {
        panel.classList.add('hidden');
        return;
    }

    const inputCodigo = document.getElementById('inputNuevoCodigo');
    const btnCrear = document.getElementById('btnCrearCodigo');
    const msgEstado = document.getElementById('msgEstadoCodigo');

    inputCodigo.placeholder = "z.B. Santiago (wird AF.Santiago)";

    btnCrear.click(async () => {}); // placeholder para evitar conflictos

    // Evitamos duplicar eventos si la función se llama varias veces
    btnCrear.onclick = async () => {
        let textoIngresado = inputCodigo.value.trim();
        let codigoTexto = "";

        if (!textoIngresado) {
            const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
            codigoTexto = `AF.Code_${randomSuffix}`;
        } else {
            let limpio = textoIngresado.replace(/^af[\.\s]*/i, '');
            codigoTexto = `AF.${limpio}`;
        }

        try {
            // Buscar el token de sesión de forma robusta en todo el localStorage
            let accessToken = '';
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('auth-token')) {
                    try {
                        const sessionData = JSON.parse(localStorage.getItem(key));
                        if (sessionData?.access_token) {
                            accessToken = sessionData.access_token;
                            break;
                        }
                    } catch (e) {
                        // Ignorar errores de parseo si hay datos corruptos
                    }
                }
            }

            const res = await fetch(`${SUPABASE_URL}/rest/v1/codigos_invitacion`, {
                method: 'POST',
                headers: {
                    ...headers,
                    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ codigo: codigoTexto, usado: false })
            });

            if (res.ok) {
                msgEstado.textContent = `✓ Code "${codigoTexto}" erfolgreich erstellt!`;
                msgEstado.className = 'text-xs mt-2 text-green-600 font-medium';
                msgEstado.classList.remove('hidden');
                inputCodigo.value = '';
                setTimeout(() => msgEstado.classList.add('hidden'), 5000);
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error('Error de Supabase:', errorData);
                msgEstado.textContent = `❌ Fehler: ${errorData.message || 'Dieser Code existiert bereits.'}`;
                msgEstado.className = 'text-xs mt-2 text-red-500 font-medium';
                msgEstado.classList.remove('hidden');
            }
        } catch (err) {
            console.error('Netzwerkfehler:', err);
            msgEstado.textContent = '❌ Verbindung zum Server fehlgeschlagen.';
            msgEstado.className = 'text-xs mt-2 text-red-500 font-medium';
            msgEstado.classList.remove('hidden');
        }
    };
}
