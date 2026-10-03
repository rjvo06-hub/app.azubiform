// ==========================================
// MÓDULO DE AUTENTICACIÓN Y REGISTRO (auth.js)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const registroForm = document.getElementById('registro-form');
    const selectProfesion = document.getElementById('ausbildung-select'); // Asegúrate de que este sea el ID de tu select en index.html

    // Cargar las profesiones de Supabase al iniciar la página de registro
    if (selectProfesion) {
        cargarProfesiones();
    }

    if (registroForm) {
        registroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // Lógica de registro existente...
        });
    }
});

async function cargarProfesiones() {
    const selectProfesion = document.getElementById('ausbildung-select');
    if (!selectProfesion) return;

    try {
        // Consultamos la tabla 'profesions' tal como está en tu Supabase
        const { data, error } = await supabaseClient
            .from('profesions')
            .select('*');

        if (error) {
            throw error;
        }

        // Limpiamos el select por si acaso
        selectProfesion.innerHTML = '<option value="">Wähle deine Ausbildung...</option>';

        if (data && data.length > 0) {
            data.forEach((prof) => {
                const option = document.createElement('option');
                // Ajusta 'id' o 'codigo' y 'nombre' según las columnas exactas de tu tabla en Supabase
                option.value = prof.id || prof.codigo; 
                option.textContent = prof.nombre_largo || prof.nombre || prof.titulo;
                selectProfesion.appendChild(option);
            });
        } else {
            selectProfesion.innerHTML = '<option value="">Keine Ausbildungen gefunden</option>';
        }

    } catch (err) {
        console.error('Error al cargar las profesiones:', err);
        selectProfesion.innerHTML = '<option value="">Fehler beim Laden</option>';
    }
}
