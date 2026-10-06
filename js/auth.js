// Dentro de tu js/auth.js
const selectTipo = document.getElementById('regTipoPrograma');
const contenedorFachrichtung = document.getElementById('contenedorFachrichtung');
const selectAusbildung = document.getElementById('regAusbildung');

selectTipo.addEventListener('change', async (e) => {
    const tipoSeleccionado = e.target.value; // 'ausbildung' o 'fos'
    
    // Mostrar el contenedor inferior
    contenedorFachrichtung.classList.remove('hidden');
    selectAusbildung.innerHTML = '<option value="" disabled selected>-- Lade Optionen... --</option>';

    // Consultar la tabla 'profesions' filtrando por la columna 'tipo'
    const { data, error } = await supabase
        .from('profesions')
        .select('*')
        .eq('tipo', tipoSeleccionado);

    if (!error && data) {
        selectAusbildung.innerHTML = '<option value="" disabled selected>-- Wähle eine Option --</option>';
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.codigo; // o el nombre oficial según guardes
            option.textContent = item.nombre_oficial;
            selectAusbildung.appendChild(option);
        });
    } else {
        selectAusbildung.innerHTML = '<option value="" disabled>Fehler beim Laden</option>';
    }
});
