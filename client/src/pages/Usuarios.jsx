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
    setUsuarios(us)
    setRoles(rs)
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
    <section className="grid gap-4 md:grid-cols-2">
      <div className="border border-slate-800 rounded-xl bg-slate-900/40 p-4">
        <h2 className="text-lg font-semibold mb-3">{isEdit ? 'Editar' : 'Nuevo'} usuario</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="block text-sm text-slate-400">ID Usuario</label><input className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800" name="idUsuario" value={form.idUsuario} onChange={onChange} maxLength={10} /></div>
          <div><label className="block text-sm text-slate-400">Correo</label><input className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800" name="correo" value={form.correo} onChange={onChange} maxLength={120} /></div>
          <div><label className="block text-sm text-slate-400">Nombres</label><input className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800" name="nombres" value={form.nombres} onChange={onChange} maxLength={50} /></div>
          <div><label className="block text-sm text-slate-400">Apellidos</label><input className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800" name="apellidos" value={form.apellidos} onChange={onChange} maxLength={60} /></div>
          <div><label className="block text-sm text-slate-400">Teléfono</label><input className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800" name="telefono" value={form.telefono} onChange={onChange} maxLength={9} /></div>
          <div><label className="block text-sm text-slate-400">Estado</label>
            <select className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800" name="estado" value={form.estado} onChange={onChange}>
              <option>Activo</option><option>Inactivo</option><option>Suspendido</option>
            </select>
          </div>
          <div><label className="block text-sm text-slate-400">Rol</label>
            <select className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800" name="idRol" value={form.idRol} onChange={onChange}>
              <option value="">(sin rol)</option>
              {roles.map(r=> <option key={r.idRol} value={r.idRol}>{r.nombre}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500" onClick={guardar}>{isEdit?'Actualizar':'Guardar'}</button>
          <button className="px-4 py-2 rounded-lg border border-slate-700" onClick={limpiar}>Limpiar</button>
        </div>
      </div>

      <div className="border border-slate-800 rounded-xl bg-slate-900/40 p-4 md:col-span-1">
        <h2 className="text-lg font-semibold mb-3">Usuarios</h2>
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
                <td className="px-3 py-2 border-b border-slate-800">{u.idRol||''}</td>
                <td className="px-3 py-2 border-b border-slate-800">{u.estado||''}</td>
                <td className="px-3 py-2 border-b border-slate-800">{u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString(): ''}</td>
                <td className="px-3 py-2 border-b border-slate-800">
                  <div className="flex gap-2">
                    <button title="Editar" className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800" onClick={()=>seleccionar(u)}><FaEdit/></button>
                    <button title="Eliminar" className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500" onClick={()=>eliminar(u.idUsuario)}><FaTrashAlt/></button>
                  </div>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
