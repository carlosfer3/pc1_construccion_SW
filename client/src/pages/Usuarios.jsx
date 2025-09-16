import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { FaTrashAlt, FaEdit } from 'react-icons/fa'

export default function Usuarios(){
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [form, setForm] = useState({ idUsuario:'', correo:'', nombres:'', apellidos:'', telefono:'', estado:'Activo', idRol:'' })
  const isEdit = useMemo(()=> usuarios.some(u=>u.idUsuario===form.idUsuario), [usuarios, form.idUsuario])

  async function cargar(){
    const [us, rs] = await Promise.all([
      api.get('/api/usuarios'),
      api.get('/api/roles').catch(()=>[]),
    ])
    // Filtrar solo los roles permitidos
    const rolesPermitidos = ['administrador', 'instructor', 'delegado', 'laboratorista']
    setUsuarios(us)
    setRoles(rs.filter(r => rolesPermitidos.includes(r.nombre.toLowerCase())))
  }
  useEffect(()=>{ cargar() },[])

  function onChange(e){ setForm(v=>({...v, [e.target.name]: e.target.value })) }
  function limpiar(){ setForm({ idUsuario:'', correo:'', nombres:'', apellidos:'', telefono:'', estado:'Activo', idRol:'' }) }

  async function guardar(){
    const payload = {
      idUsuario: form.idUsuario.trim(),
      correo: form.correo.trim(),
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      telefono: form.telefono.trim() || null,
      estado: form.estado,
      idRol: form.idRol || null,
    }
    if (!isEdit) {
      const clave = prompt('Ingrese una clave temporal para el usuario:')
      if (!clave) { alert('La clave es obligatoria para crear'); return }
      payload.clave = clave
    }
    if (!payload.idUsuario || !payload.correo || !payload.nombres || !payload.apellidos) {
      alert('Completa los campos obligatorios'); return
    }
    if (isEdit){
      await api.put(`/api/usuarios/${encodeURIComponent(payload.idUsuario)}`, payload)
    } else {
      await api.post('/api/usuarios', payload)
    }
    await cargar(); limpiar()
  }

  async function eliminar(id){
    if (!confirm(`Eliminar definitivamente ${id}? Esta acción no se puede deshacer.`)) return
    try {
      await api.del('/api/usuarios/' + encodeURIComponent(id))
      await cargar()
    } catch (e){
      alert('No se pudo eliminar: ' + (e.message||''))
    }
  }

  function seleccionar(u){
    setForm({
      idUsuario: u.idUsuario,
      correo: u.correo,
      nombres: u.nombres,
      apellidos: u.apellidos,
      telefono: u.telefono||'',
      estado: u.estado||'Activo',
      idRol: u.idRol||'',
    })
  }

  return (
    <section className="card">
      <h2 className="title">Administración de Usuarios</h2>
      <div className="grid gap-6 md:grid-cols-2 mt-4">
        <div>
          <h3 className="font-semibold mb-2">{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="block text-sm text-slate-400">ID Usuario</label><input className="input" name="idUsuario" value={form.idUsuario} onChange={onChange} maxLength={10} /></div>
            <div><label className="block text-sm text-slate-400">Correo</label><input className="input" name="correo" value={form.correo} onChange={onChange} maxLength={120} /></div>
            <div><label className="block text-sm text-slate-400">Nombres</label><input className="input" name="nombres" value={form.nombres} onChange={onChange} maxLength={50} /></div>
            <div><label className="block text-sm text-slate-400">Apellidos</label><input className="input" name="apellidos" value={form.apellidos} onChange={onChange} maxLength={60} /></div>
            <div><label className="block text-sm text-slate-400">Teléfono</label><input className="input" name="telefono" value={form.telefono} onChange={onChange} maxLength={9} /></div>
            <div><label className="block text-sm text-slate-400">Estado</label>
              <select className="input" name="estado" value={form.estado} onChange={onChange}>
                <option>Activo</option><option>Inactivo</option><option>Suspendido</option>
              </select>
            </div>
            <div><label className="block text-sm text-slate-400">Rol</label>
              <select className="input" name="idRol" value={form.idRol} onChange={onChange}>
                <option value="">(sin rol)</option>
                {roles.map(r=> <option key={r.idRol} value={r.idRol}>{r.nombre === 'Logística' ? 'Laboratorista' : r.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-primary" onClick={guardar}>{isEdit?'Actualizar':'Guardar'}</button>
            <button className="btn-secondary" onClick={limpiar}>Limpiar</button>
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Lista de usuarios</h3>
          <div className="overflow-auto rounded-lg border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900">
                <tr className="text-left">
                  <th className="px-3 py-2 border-b border-slate-800">ID</th>
                  <th className="px-3 py-2 border-b border-slate-800">Nombre</th>
                  <th className="px-3 py-2 border-b border-slate-800">Correo</th>
                  <th className="px-3 py-2 border-b border-slate-800">Rol</th>
                  <th className="px-3 py-2 border-b border-slate-800">Estado</th>
                  <th className="px-3 py-2 border-b border-slate-800">Último acceso</th>
                  <th className="px-3 py-2 border-b border-slate-800"></th>
                </tr>
              </thead>
              <tbody>
              {usuarios.map(u=> (
                <tr key={u.idUsuario} className="odd:bg-slate-900/40">
                  <td className="px-3 py-2 border-b border-slate-800">{u.idUsuario}</td>
                  <td className="px-3 py-2 border-b border-slate-800">{u.nombres} {u.apellidos}</td>
                  <td className="px-3 py-2 border-b border-slate-800">{u.correo}</td>
                  <td className="px-3 py-2 border-b border-slate-800">{roles.find(r => r.idRol === u.idRol)?.nombre === 'Logística' ? 'Laboratorista' : roles.find(r => r.idRol === u.idRol)?.nombre || ''}</td>
                  <td className="px-3 py-2 border-b border-slate-800">{u.estado||''}</td>
                  <td className="px-3 py-2 border-b border-slate-800">{u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString(): ''}</td>
                  <td className="px-3 py-2 border-b border-slate-800">
                    <div className="flex gap-2">
                      <button title="Editar" className="btn-secondary" onClick={()=>seleccionar(u)}><FaEdit/></button>
                      <button title="Eliminar" className="btn-danger" onClick={()=>eliminar(u.idUsuario)}><FaTrashAlt/></button>
                    </div>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
