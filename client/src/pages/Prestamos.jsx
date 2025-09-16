import { useState, useEffect } from 'react'
import { api } from '../api'
import { useAuth } from '../ctx/AuthContext'

export default function Prestamos() {
  const { user } = useAuth()
  const [prestamos, setPrestamos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    idInsumo: '', cantidad: 1, idUsuario_receptor: '', fecha_compromiso: '', entregado_por: user?.idUsuario || ''
  })

  useEffect(() => {
    setLoading(true)
    api.get('/api/prestamos')
      .then(data => setPrestamos(Array.isArray(data) ? data : []))
      .catch(() => setError('No se pudo cargar préstamos'))
      .finally(() => setLoading(false))
  }, [])

  function openModal() {
    setForm({ idInsumo: '', cantidad: 1, idUsuario_receptor: '', fecha_compromiso: '', entregado_por: user?.idUsuario || '' })
    setModalOpen(true)
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    api.post('/api/prestamos', form)
      .then(() => { setModalOpen(false); window.location.reload() })
      .catch(() => setError('Error al registrar préstamo'))
      .finally(() => setLoading(false))
  }

  return (
    <div className="card">
      <div className="toolbar" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <strong>Préstamos</strong>
        <button className="btn-sm" onClick={openModal}>+ Nuevo préstamo</button>
      </div>
      {loading && <div className="muted">Cargando…</div>}
      {error && <div className="muted">{error}</div>}
      <table className="min-w-full text-sm mt-4">
        <thead className="bg-slate-900">
          <tr>
            <th>ID</th>
            <th>Insumo</th>
            <th>Cantidad</th>
            <th>Receptor</th>
            <th>Fecha préstamo</th>
            <th>Fecha compromiso</th>
            <th>Devuelto</th>
          </tr>
        </thead>
        <tbody>
          {prestamos.map(p => (
            <tr key={p.idPrestamo}>
              <td>{p.idPrestamo}</td>
              <td>{p.idInsumo}</td>
              <td>{p.cantidad}</td>
              <td>{p.idUsuario_receptor}</td>
              <td>{p.fecha_prestamo}</td>
              <td>{p.fecha_compromiso}</td>
              <td>{p.devuelto ? 'Sí' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {modalOpen && (
        <div className="modal">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3>Registrar Préstamo</h3>
            <input name="idInsumo" placeholder="ID Insumo" value={form.idInsumo} onChange={handleChange} required />
            <input name="cantidad" type="number" min="1" placeholder="Cantidad" value={form.cantidad} onChange={handleChange} required />
            <input name="idUsuario_receptor" placeholder="ID Receptor" value={form.idUsuario_receptor} onChange={handleChange} required />
            <input name="fecha_compromiso" type="datetime-local" value={form.fecha_compromiso} onChange={handleChange} required />
            <button type="submit" className="btn-primary">Registrar</button>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
          </form>
        </div>
      )}
    </div>
  )
}
