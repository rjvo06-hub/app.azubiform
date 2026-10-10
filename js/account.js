// ./js/account.js
import { SUPABASE_URL, headers } from './config.js';

export function inicializarMiCuenta() {
    // Inyectar el HTML del modal dinámicamente o asegurarnos de que los eventos estén listos
    const btnGuardar = document.getElementById('btnGuardarCuenta');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarDatosCuenta);
    }
}

window.abrirModalMiCuenta = async function() {
    document.getElementById('modalMiCuenta').classList.remove('hidden');
    const usuarioActual = localStorage.getItem('usuario_actual');
    if (!usuarioActual) return;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?nombre=eq.${encodeURIComponent(usuarioActual)}&select=*`, {
            headers: { ...headers }
        });
        if (response.ok) {
            const data = await response.json();
            if (data.length > 0) {
                const user = data[0];
                document.getElementById('cuentaTeacher').value = user.teacher || '';
                document.getElementById('cuentaWorkplace').value = user.workplace || '';
                document.getElementById('cuentaClass').value = user.class || '';
            }
        }
    } catch (err) {
        console.error("Error al cargar datos de la cuenta:", err);
    }
};

window.cerrarModalMiCuenta = function() {
    document.getElementById('modalMiCuenta').classList.add('hidden');
};

async function guardarDatosCuenta() {
    const usuarioActual = localStorage.getItem('usuario_actual');
    if (!usuarioActual) return alert("Benutzer nicht gefunden.");

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?nombre=eq.${encodeURIComponent(usuarioActual)}`, {
            method: 'PATCH',
            headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({
                teacher: document.getElementById('cuentaTeacher').value,
                workplace: document.getElementById('cuentaWorkplace').value,
                class: document.getElementById('cuentaClass').value
            })
        });

        if (response.ok) {
            alert("✅ Persönliche Daten erfolgreich aktualisiert!");
            window.cerrarModalMiCuenta();
        } else {
            alert("❌ Fehler beim Aktualisieren in Supabase.");
        }
    } catch (err) {
        console.error(err);
        alert("❌ Netzwerkfehler.");
    }
}

