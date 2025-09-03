//Llena los options con los datos que deseemos
const llenarSelect = (selector, data, llave1, llave2) => {
    selector.querySelectorAll("option:not([hidden])").forEach(opt => opt.remove())
    data.forEach(e => {
        const option = document.createElement('option')
        option.value = e[llave1]
        option.textContent = e[llave2]
        selector.appendChild(option)
    });
}

//Verifica que los insumos seleccionados no hayan sido seleccionados antes
const verificarInsumoSeleccionado = (id, listaInsumos) => {
    for (const li of listaInsumos.querySelectorAll('li')) {
        if (li.dataset.value === id) return true
    }

    return false
}

//Muestra los insumos seleccionados en la lista visible
const mostrarInsumosSeleccionados = (id, nombre, listaInsumos) => {
    const li = document.createElement('li')
    li.dataset.value = id
    li.textContent = nombre
    listaInsumos.appendChild(li)
}

//Crea inputs invisibles con los datos de los insumos seleccionados (los formularios solo envian los datos de los inputs)
const crearInputInvisibles = (nombre, contenedor_insumos) => {
    const inputInvisible = document.createElement('input')
    inputInvisible.type = 'hidden'
    inputInvisible.name = 'insumos[]'
    inputInvisible.value = nombre
    contenedor_insumos.appendChild(inputInvisible)
}

export {
    llenarSelect,
    verificarInsumoSeleccionado,
    mostrarInsumosSeleccionados,
    crearInputInvisibles
}