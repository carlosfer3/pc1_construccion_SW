//Importo los datos del JSON
import { cursos, instructores, evaluaciones, insumos } from "./db.js"

import { llenarSelect, verificarInsumoSeleccionado, mostrarInsumosSeleccionados, crearInputInvisibles } from "./utils.js"
import { savePedido } from './firebase.js'
import { buildData } from './data.js'


//Selecciono del DOM los HTML Options
const cursoSelect = document.getElementById('cursoSelect')
const instSugeridos = document.getElementById('instSugeridos')
const practicaSelect = document.getElementById('practicaSelect')
const insumosSelect = document.getElementById('insumosSelect')
const listaInsumos = document.getElementById('listaInsumos')
const reset = document.getElementById('reset')
const contenedor_insumos = document.getElementById('contenedor-inputs-insumos')
const pedidoForm = document.getElementById('pedidoForm')
const salida = document.getElementById('salida')

//Llenando los cursos
llenarSelect(cursoSelect, cursos, 'codigo', 'nombre')

//Llenando los insumos
llenarSelect(insumosSelect, insumos, 'id', 'nombre')

//Cuando un curso fue seleccionado
cursoSelect.addEventListener('change', () => {
    const codigoCurso = cursoSelect.value

    //Llenando instructores
    llenarSelect(instSugeridos, instructores[codigoCurso], 'codigo', 'nombres')
    //Llenando las prácticas
    llenarSelect(practicaSelect, evaluaciones[codigoCurso], 'tipo', 'nombre')
})

//Cuando un insumo fue seleccionado
insumosSelect.addEventListener('change', () => {
    const id = insumosSelect.value
    const nombre = insumosSelect.options[insumosSelect.selectedIndex].textContent

    if (!verificarInsumoSeleccionado(id, listaInsumos)) {
        mostrarInsumosSeleccionados(id, nombre, listaInsumos)
        crearInputInvisibles(nombre, contenedor_insumos)
    }
})

//Resetear todo
reset.addEventListener('click', () => {
    listaInsumos.innerHTML = ""
    contenedor_insumos.innerHTML = ""
    instSugeridos.innerHTML = `<option value="" hidden>— No disponible —</option>`
    practicaSelect.innerHTML = `<option value="" hidden>— Primero elige un curso —</option>`
})

// Enviar a Firebase al guardar
pedidoForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    try {
        const data = buildData()
        const { key } = await savePedido(data)
        if (salida) {
            salida.hidden = false
            salida.textContent = `Guardado con clave: ${key}\n` + JSON.stringify(data, null, 2)
        }
        // Opcionalmente, puedes resetear el formulario
        // pedidoForm.reset()
    } catch (err) {
        console.error(err)
        if (salida) {
            salida.hidden = false
            salida.textContent = `Error al guardar: ${err?.message || err}`
        }
        alert('Ocurrió un error al guardar. Revisa la consola.')
    }
})
