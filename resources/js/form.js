//Importo los datos del JSON
import { cursos, instructores, evaluaciones, insumos } from "./db.js"

import { llenarSelect, verificarInsumoSeleccionado, mostrarInsumosSeleccionados, crearInputInvisibles } from "./utils.js"
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
const modalOverlay = document.getElementById('modalOverlay')
const modalPrint = document.getElementById('modalPrint')
// Sin vista previa embebida

let ultimoPedido = null // { key, data, numeroConstancia?, pdfUrl? }

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
    if (modalOverlay) {
        modalOverlay.classList.remove('is-open')
        modalOverlay.hidden = true
    }
    // Sin vista previa embebida
})

// Enviar a Firebase al guardar (abrimos modal aunque no se logre guardar)
pedidoForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    try {
        const data = buildData()
        // Prepara el pedido local e inmediatamente abre el modal
        ultimoPedido = { key: null, data }
        if (modalOverlay) {
            modalOverlay.hidden = false
            modalOverlay.classList.add('is-open')
        }
        // Intento de guardado en segundo plano
        try {
            const { savePedido } = await import('./firebase.js')
            const { key } = await savePedido(data)
            ultimoPedido.key = key
        } catch (saveErr) {
            console.warn('No se pudo guardar en Firestore. Continuamos con PDF local.', saveErr)
        }
        // Opcionalmente, puedes resetear el formulario
        // pedidoForm.reset()
    } catch (err) {
        console.error(err)
        alert('Ocurrió un error al guardar. Revisa la consola.')
    }
})

// Genera número incremental local: SOL-000001, SOL-000002, ...
const getNextNumeroSolicitud = () => {
    const k = 'solicitudCounter'
    const current = parseInt(localStorage.getItem(k) || '0', 10) || 0
    const next = current + 1
    localStorage.setItem(k, String(next))
    return `SOL-${String(next).padStart(6, '0')}`
}

// Construye el PDF de la solicitud
// Carga perezosa de jsPDF (UMD) para evitar dependencias de Babel en navegadores
let __jsPDFCtor = null
const loadJsPDF = async () => {
    if (__jsPDFCtor) return __jsPDFCtor
    if (window.jspdf?.jsPDF) {
        __jsPDFCtor = window.jspdf.jsPDF
        return __jsPDFCtor
    }
    await new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
        s.async = true
        s.onload = resolve
        s.onerror = () => reject(new Error('No se pudo cargar jsPDF'))
        document.head.appendChild(s)
    })
    if (!window.jspdf?.jsPDF) throw new Error('jsPDF no disponible tras la carga')
    __jsPDFCtor = window.jspdf.jsPDF
    return __jsPDFCtor
}

const construirPdf = async (payload, numeroConstancia) => {
    const jsPDF = await loadJsPDF()
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const W = doc.internal.pageSize.getWidth()
    const M = 40

    // Encabezado
    doc.setFillColor(30, 58, 138) // azul oscuro
    doc.rect(0, 0, W, 90, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.text('Constancia de Solicitud de Laboratorio', M, 50)
    doc.setFontSize(11)
    doc.text(`N° ${numeroConstancia}`, W - M - 200, 50, { align: 'left', maxWidth: 200 })

    // Cuerpo
    doc.setTextColor(20, 20, 20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    let y = 120

    const line = (label, value) => {
      doc.setFont('helvetica', 'bold')
      doc.text(`${label}:`, M, y)
      doc.setFont('helvetica', 'normal')
      doc.text(String(value ?? '-'), M + 140, y, { maxWidth: W - M*2 - 160 })
      y += 22
    }

    line('Curso', `${payload.curso?.codigo || ''} - ${payload.curso?.nombre || ''}`.trim())
    line('Instructor', `${payload.instructor?.codigo || ''} - ${payload.instructor?.nombres || ''}`.trim())
    line('Práctica', `${payload.practica?.tipo || ''} - ${payload.practica?.nombre || ''}`.trim())
    line('Código Alumno', payload.alumnoCodigo || '-')

    // Insumos
    y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Insumos', M, y)
    y += 12
    doc.setDrawColor(200)
    doc.line(M, y, W - M, y)
    y += 14
    doc.setFont('helvetica', 'normal')
    const ins = (payload.insumos && payload.insumos.length) ? payload.insumos : ['Ninguno']
    ins.forEach((nombre, i) => {
      doc.circle(M + 4, y - 4, 2, 'F')
      doc.text(`• ${nombre}`, M + 12, y, { maxWidth: W - M*2 - 20 })
      y += 18
    })

    // Observaciones
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.text('Observaciones', M, y)
    y += 12
    doc.setDrawColor(200)
    doc.line(M, y, W - M, y)
    y += 14
    doc.setFont('helvetica', 'normal')
    const obs = payload.observaciones?.trim() ? payload.observaciones.trim() : 'Ninguna'
    doc.text(obs, M, y, { maxWidth: W - M*2 })

    // Pie
    const fecha = new Date().toLocaleString()
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text(`Generado: ${fecha}`, M, 800)
    doc.text(`Constancia: ${numeroConstancia}`, W - M - 200, 800, { maxWidth: 200 })

    return doc
}

// Acción del botón Imprimir en el modal
if (modalPrint) {
    modalPrint.addEventListener('click', async () => {
        if (!ultimoPedido?.data) return
        try {
            modalPrint.disabled = true
            modalPrint.textContent = 'Generando…'

            // Asigna número de solicitud incremental si aún no existe
            const numeroConstancia = ultimoPedido.numeroConstancia || getNextNumeroSolicitud()
            ultimoPedido.numeroConstancia = numeroConstancia

            const doc = await construirPdf(ultimoPedido.data, numeroConstancia)
            const blob = doc.output('blob')

            // Abrir el PDF local inmediatamente
            const localOpenUrl = URL.createObjectURL(blob)
            window.open(localOpenUrl, '_blank')
            if (modalOverlay) {
                modalOverlay.classList.remove('is-open')
                modalOverlay.hidden = true
            }
        } catch (err) {
            console.error(err)
            alert('No se pudo generar el PDF. Revisa la consola.')
        } finally {
            modalPrint.textContent = 'Imprimir Solicitud'
            modalPrint.disabled = false
        }
    })
}

// Cerrar modal al hacer click fuera del cuadro
if (modalOverlay) {
    modalOverlay.addEventListener('click', (ev) => {
        if (ev.target === modalOverlay) {
            modalOverlay.classList.remove('is-open')
            modalOverlay.hidden = true
            // Sin vista previa embebida
        }
    })
}
