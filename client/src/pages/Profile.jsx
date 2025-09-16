import { useEffect, useState } from 'react'
import { useAuth } from '../ctx/AuthContext'
import { api } from '../api'

export default function Profile(){
  const { user, login } = useAuth()
  const [form, setForm] = useState({ nombres:'', apellidos:'', correo:'', telefono:'' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(()=>{
    if (!user) return
    (async ()=>{
      const data = await api.get(`/api/profile/${encodeURIComponent(user.idUsuario)}`)
      setForm({ nombres: data.nombres||'', apellidos: data.apellidos||'', correo: data.correo||'', telefono: data.telefono||'' })
    })()
  },[user])

  function onChange(e){ setForm(v=> ({...v, [e.target.name]: e.target.value })) }
  async function onSave(){
    setSaving(true); setMsg('')
    try{
      await api.put(`/api/profile/${encodeURIComponent(user.idUsuario)}`, form)
      login({ ...user, nombres: form.nombres, apellidos: form.apellidos, correo: form.correo })
      setMsg('Perfil actualizado')
    }catch(err){ setMsg('Error al actualizar perfil') } finally { setSaving(false) }
  }

  return (
    <div className="min-h-[70vh] grid place-items-center">
      <div className="w-full max-w-lg border border-slate-200 rounded-2xl p-6 bg-white">
        <h2 className="text-xl font-semibold mb-4">Editar Perfil</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="block text-sm text-slate-600">Nombres</label><input name="nombres" value={form.nombres} onChange={onChange} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <div><label className="block text-sm text-slate-600">Apellidos</label><input name="apellidos" value={form.apellidos} onChange={onChange} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <div className="md:col-span-2"><label className="block text-sm text-slate-600">Correo</label><input name="correo" value={form.correo} onChange={onChange} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <div className="md:col-span-2"><label className="block text-sm text-slate-600">Teléfono</label><input name="telefono" value={form.telefono} onChange={onChange} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
        </div>
        {msg && <p className="text-sm mt-3" style={{color: msg.includes('Error')?'#ef4444':'#059669'}}>{msg}</p>}
        <div className="mt-4 flex gap-2">
          <button disabled={saving} onClick={onSave} className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-60">{saving?'Guardando...':'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}
