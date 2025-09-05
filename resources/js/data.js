// Aquí defines qué datos se envían a Firebase.
// Puedes ajustar el mapeo según lo que necesites guardar.

export function buildData() {
  const cursoSelect = document.getElementById('cursoSelect')
  const instSugeridos = document.getElementById('instSugeridos')
  const practicaSelect = document.getElementById('practicaSelect')
  const alumnoCodigo = document.getElementById('alumnoCodigo')
  const obs = document.getElementById('obs')

  const curso = {
    codigo: cursoSelect.value || null,
    nombre: cursoSelect.options[cursoSelect.selectedIndex]?.textContent || null,
  }

  const instructor = {
    codigo: instSugeridos.value || null,
    nombres: instSugeridos.options[instSugeridos.selectedIndex]?.textContent || null,
  }

  const practica = {
    tipo: practicaSelect.value || null,
    nombre: practicaSelect.options[practicaSelect.selectedIndex]?.textContent || null,
  }

  const insumos = Array.from(document.querySelectorAll('input[name="insumos[]"]'))
    .map(i => i.value)

  // Ajusta/añade campos según lo que necesites
  return {
    curso,
    instructor,
    practica,
    alumnoCodigo: alumnoCodigo.value || null,
    observaciones: obs.value || '',
    insumos,
    createdAt: new Date().toISOString(),
  }
}

