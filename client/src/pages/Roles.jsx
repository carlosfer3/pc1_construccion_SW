import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Roles(){
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [seleccion, setSeleccion] = useState({ idUsuario:'', idRol:'' })
  async function cargar(){
    const [us, rs] = await Promise.all([
      api.get('/api/usuarios'),
      api.get('/api/roles'),
    ])
    setUsuarios(us); setRoles(rs)
  }
  useEffect(()=>{ cargar() },[])
  async function asignar(){
    if(!seleccion.idUsuario || !seleccion.idRol) return alert('Seleccione usuario y rol')
    await api.put(`/api/usuarios/${encodeURIComponent(seleccion.idUsuario)}/rol`, { idRol: seleccion.idRol })
    await cargar()
  }
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="border border-slate-800 rounded-xl bg-slate-900/40 p-4">
        <h2 className="text-lg font-semibold mb-3">Usuarios</h2>
        <div className="overflow-auto rounded-lg border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900">
              <tr className="text-left">
                <th className="px-3 py-2 border-b border-slate-800">ID</th>
                <th className="px-3 py-2 border-b border-slate-800">Nombre</th>
                <th className="px-3 py-2 border-b border-slate-800">Rol</th>
                <th className="px-3 py-2 border-b border-slate-800"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u=> (
                <tr key={u.idUsuario} className="odd:bg-slate-900/40">
                  <td className="px-3 py-2 border-b border-slate-800">{u.idUsuario}</td>
                  <td className="px-3 py-2 border-b border-slate-800">{u.nombres} {u.apellidos}</td>
                  <td className="px-3 py-2 border-b border-slate-800">{u.idRol||''}</td>
                  <td className="px-3 py-2 border-b border-slate-800"><button className="px-3 py-1.5 rounded-lg border border-slate-700" onClick={()=> setSeleccion({ idUsuario:u.idUsuario, idRol: u.idRol||'' })}>Seleccionar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="border border-slate-800 rounded-xl bg-slate-900/40 p-4">
        <h2 className="text-lg font-semibold mb-3">Asignar rol</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-400">Usuario</label>
            <input className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800" value={seleccion.idUsuario} readOnly />
          </div>
          <div>
            <label className="block text-sm text-slate-400">Rol</label>
            <select className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800" value={seleccion.idRol} onChange={e=> setSeleccion(s=>({...s, idRol:e.target.value}))}>
              <option value="">(sin rol)</option>
              {roles.map(r=> <option key={r.idRol} value={r.idRol}>{r.nombre}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500" onClick={asignar}>Asignar</button>
        </div>
      </div>
    </section>
  )
}
