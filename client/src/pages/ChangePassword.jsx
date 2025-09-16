import { useState } from 'react'
import { useAuth } from '../ctx/AuthContext'
import { api } from '../api'

export default function ChangePassword(){
  const { user } = useAuth()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [conf, setConf] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  async function onSubmit(e){
    e.preventDefault(); setMsg('')
    if (nueva !== conf) { setMsg('Las contraseñas no coinciden'); return }
    setSaving(true)
    try {
      await api.post('/api/auth/change-password', { idUsuario: user.idUsuario, actual, nueva })
      setMsg('Contraseña actualizada')
      setActual(''); setNueva(''); setConf('')
    } catch (err) {
      setMsg('No se pudo actualizar la contraseña')
    } finally { setSaving(false) }
  }

  return (
    <div className="min-h-[70vh] grid place-items-center">
      <div className="w-full max-w-md border border-slate-200 rounded-2xl p-6 bg-white">
        <h2 className="text-xl font-semibold mb-4">Cambiar Contraseña</h2>
        <form onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="block text-sm text-slate-600">Contraseña actual</label>
            <input value={actual} onChange={e=> setActual(e.target.value)} type="password" className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" />
          </div>
          <div className="mb-3">
            <label className="block text-sm text-slate-600">Nueva contraseña</label>
            <input value={nueva} onChange={e=> setNueva(e.target.value)} type="password" className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-slate-600">Confirmar nueva contraseña</label>
            <input value={conf} onChange={e=> setConf(e.target.value)} type="password" className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" />
          </div>
          {msg && <p className="text-sm mb-2" style={{color: msg.includes('no') || msg.includes('No') ? '#ef4444' : '#059669'}}>{msg}</p>}
          <button disabled={saving} className="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-60">{saving?'Actualizando…':'Actualizar'}</button>
        </form>
      </div>
    </div>
  )
}
