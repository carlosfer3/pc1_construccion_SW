import { useEffect, useRef, useState, useDeferredValue, memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../ctx/AuthContext'
import { api } from '../api'
import './admin-dashboard.css'

export default function AdminDashboard(){
  // Asistente IA Gemini
  const [aiQuery, setAiQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiShow, setAiShow] = useState(false)
  const [aiTyped, setAiTyped] = useState('')
  const aiRef = useRef(null)
  async function handleAiSearch(e){
    e.preventDefault()
    if (!aiQuery.trim() || aiLoading) return
    setAiLoading(true); setAiAnswer(''); setAiShow(true); setAiTyped('')
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyAV-9HOcggGQQpy0HTB5tdu39hOHv0JN2E', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: aiQuery }]}]
        })
      })
      const data = await res.json()
      const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No se obtuvo respuesta.'
      setAiAnswer(answer)
      // Efecto máquina de escribir
      let i = 0
      function typeWriter(){
        setAiTyped(answer.slice(0,i))
        if(i < answer.length){
          i++
          setTimeout(typeWriter, 12 + Math.random()*30)
        }
      }
      typeWriter()
    } catch {
      setAiAnswer('Error al conectar con el asistente.')
      setAiTyped('Error al conectar con el asistente.')
    } finally { setAiLoading(false) }
  }
  const [notif, setNotif] = useState(3)
  const [openBell, setOpenBell] = useState(false)
  const [openMenu, setOpenMenu] = useState(false)
  const bellWrapRef = useRef(null)
  const menuWrapRef = useRef(null)
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const location = useLocation()
  const section = location.pathname.replace('/admin','').split('/')[1] || ''

  useEffect(()=>{
    const id = setInterval(()=>{
      const n = Math.max(0, ((Math.sin(Date.now()/2500)*2+3)|0))
      setNotif(n)
    }, 2000)
    const onClickAway = (e) => {
      if (bellWrapRef.current && !bellWrapRef.current.contains(e.target)) setOpenBell(false)
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) setOpenMenu(false)
    }
    document.addEventListener('click', onClickAway)
    return ()=> { clearInterval(id); document.removeEventListener('click', onClickAway) }
  },[])

  // Data for widgets
  const [kpis, setKpis] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [low, setLow] = useState([])
  const [acts, setActs] = useState([])
  const [monthly, setMonthly] = useState([])
  const [sols, setSols] = useState([])
  const [solsLoading, setSolsLoading] = useState(false)
  const [solsError, setSolsError] = useState('')
  // Inventario
  const [tipos, setTipos] = useState([])
  const [ins, setIns] = useState([])
  const [invLoading, setInvLoading] = useState(false)
  const [invSoftLoading, setInvSoftLoading] = useState(false)
  const [invFilters, setInvFilters] = useState({ q:'', idTipo:'', prest: false, low:false })
  const deferredQ = useDeferredValue(invFilters.q)
  const [invModalOpen, setInvModalOpen] = useState(false)
  const [invSaving, setInvSaving] = useState(false)
  const [newIns, setNewIns] = useState({ idInsumo:'', nombre:'', idTipo:'', stock:0, capacidad_valor:'', capacidad_unidad:'', es_prestable:false })
  const [estadoFilter, setEstadoFilter] = useState('')
  const reqIdRef = useRef(0)
  // Usuarios inline (state)
  const [usr, setUsr] = useState([])
  const [usrLoading, setUsrLoading] = useState(false)
  const [roles, setRoles] = useState([])
  const [usrSearch, setUsrSearch] = useState('')
  const [usrModalOpen, setUsrModalOpen] = useState(false)
  const [usrSaving, setUsrSaving] = useState(false)
  const [usrEditing, setUsrEditing] = useState(false)
  const emptyUser = { idUsuario:'', nombres:'', apellidos:'', correo:'', telefono:'', idRol:'', estado:'Activo', clave:'' }
  const [usrForm, setUsrForm] = useState(emptyUser)

  useEffect(()=>{
    (async ()=>{
      try{
        const [k,u,l,a,m,sl] = await Promise.all([
          api.get('/api/admin/kpis'),
          api.get('/api/admin/upcoming-practices'),
          api.get('/api/admin/low-stock'),
          api.get('/api/admin/activities'),
          api.get('/api/admin/monthly-requests'),
          api.get('/api/solicitudes?limit=50'),
        ])
        setKpis(k); setUpcoming(u); setLow(l); setActs(a); setMonthly(m); setSols(sl)
      }catch(e){ /* ignore */ }
    })()
  },[])

  async function reloadSolicitudes(nextEstado){
    const qs = new URLSearchParams()
    qs.set('limit','50')
    if (nextEstado) qs.set('estado', nextEstado)
    const myId = ++reqIdRef.current
    setSolsLoading(true); setSolsError('')
    try{ 
      const data = await api.get('/api/solicitudes?'+qs.toString()); 
      if (reqIdRef.current === myId) {
        setSols(data); 
        await refreshKpis()
      }
    } catch(e){
      if (reqIdRef.current === myId) setSolsError('No se pudo cargar solicitudes')
    } finally {
      if (reqIdRef.current === myId) setSolsLoading(false)
    }
  }

  async function refreshKpis(){
    try { const data = await api.get('/api/admin/kpis'); setKpis(data) } catch {}
  }

  // Cargar por defecto al entrar a la sección
  useEffect(()=>{
    if (section === 'solicitudes') {
      reloadSolicitudes(estadoFilter)
    } else if (section === '') {
      refreshKpis()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[section])

  // Auto refresco de KPIs y stock bajo (cada 20s)
  async function fetchLow(){
    try { const data = await api.get('/api/admin/low-stock?threshold=10&limit=12'); setLow(Array.isArray(data)? data: []) } catch{}
  }
  useEffect(()=>{
    const id = setInterval(()=> { refreshKpis(); fetchLow() }, 20000)
    return ()=> clearInterval(id)
  },[])
  useEffect(()=>{ if (section==='') fetchLow() }, [section])

  // Inventario loaders
  async function loadTipos(){
    try{ const data = await api.get('/api/tipos-insumo'); setTipos(Array.isArray(data)? data:[]) } catch { setTipos([]) }
  }
  function shallowSameById(a,b){ if (a.length!==b.length) return false; for (let i=0;i<a.length;i++){ if (a[i].idInsumo!==b[i].idInsumo || a[i].stock!==b[i].stock) return false } return true }
  async function loadInsumos(f=invFilters){
    const params = new URLSearchParams(); if (f.q) params.set('search', f.q); if (f.idTipo) params.set('idTipo', f.idTipo); if (f.prest) params.set('prestablesOnly','true'); if (f.low) params.set('lowStock','true'); params.set('limit','100')
    if (ins.length === 0) setInvLoading(true); else setInvSoftLoading(true)
    try{ const data = await api.get('/api/insumos?'+params.toString()); if (!shallowSameById(ins, data)) setIns(data) } catch{} finally { setInvLoading(false); setInvSoftLoading(false) }
  }
  useEffect(()=>{ if (section==='inventario'){ loadTipos(); loadInsumos() } },[section])
  // Usuarios loaders (fetch roles + users when entering the section)
  async function loadRoles(){ try{ const data = await api.get('/api/roles'); setRoles(Array.isArray(data)? data:[]) } catch{} }
  async function loadUsers(){ setUsrLoading(true); try{ const data = await api.get('/api/usuarios'); setUsr(Array.isArray(data)? data:[]) } catch{} finally { setUsrLoading(false) } }
  useEffect(()=>{ if (section==='usuarios'){ loadRoles(); loadUsers() } }, [section])
  const usrFiltered = usr.filter(u => {
    if (!usrSearch) return true
    const q = usrSearch.toLowerCase()
    return (u.nombres+' '+u.apellidos).toLowerCase().includes(q) || (u.correo||'').toLowerCase().includes(q) || (u.idUsuario||'').toLowerCase().includes(q)
  })
  function openUserModal(user){ if (user){ setUsrEditing(true); setUsrForm({ ...user, clave:'' }) } else { setUsrEditing(false); setUsrForm(emptyUser) } setUsrModalOpen(true) }
  function onUsrChange(e){ const {name, value} = e.target; setUsrForm(f=> ({...f, [name]: value })) }
  async function saveUser(){
    setUsrSaving(true)
    try{
      if (usrEditing){
        const payload = { ...usrForm }; if (!payload.clave) delete payload.clave; delete payload.ultimo_acceso
        await api.put(`/api/usuarios/${encodeURIComponent(usrForm.idUsuario)}`, payload)
      } else {
        const payload = { ...usrForm };
        if (!payload.clave) {
          payload.clave = 'admin';
          alert('La clave inicial para el usuario será "admin". El usuario deberá cambiarla en su primer inicio de sesión.');
        }
        await api.post('/api/usuarios', payload)
      }
      setUsrModalOpen(false); await loadUsers()
    } catch(e){} finally { setUsrSaving(false) }
  }
  async function delUser(id){ if (!confirm('¿Eliminar usuario '+id+'?')) return; try{ await api.del('/api/usuarios/'+encodeURIComponent(id)); await loadUsers() } catch{} }
  // Live search con useDeferredValue para evitar jank al teclear
  useEffect(()=>{ if (section==='inventario'){ const t = setTimeout(()=> loadInsumos({ ...invFilters, q: deferredQ }), 350); return ()=> clearTimeout(t) } }, [deferredQ, section])
  useEffect(()=>{ if (section==='inventario'){ loadInsumos() } }, [invFilters.idTipo, invFilters.prest, invFilters.low, section])
  // Critico: 0..5, Bajo: >5..10, Normal: >10
  function stockClass(s){ if (s<=5) return 'stock crit'; if (s<=10) return 'stock low'; return 'stock ok' }
  async function adjustStock(idInsumo, delta){
    try{ 
      const r = await api.patch(`/api/insumos/${encodeURIComponent(idInsumo)}/stock`, { delta })
      setIns(list => list.map(x => x.idInsumo===idInsumo ? { ...x, stock: r.stock } : x))
      refreshKpis()
    } catch{}
  }

  // Card estilo moderno para inventario (sin tablas)
  const InvTag = memo(function InvTag({ children, className='' }){
    return <span className={`rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 ${className}`}>{children}</span>
  })
  const InvCard = memo(function InvCard({ item }){
    const tags = [
      item.tipoNombre,
      item.es_prestable ? 'Prestable' : 'Consumible',
      (item.capacidad_valor!=null && item.capacidad_unidad) ? `Capacidad: ${item.capacidad_valor} ${item.capacidad_unidad}` : null,
    ].filter(Boolean)
    return (
      <article className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg transition hover:shadow-emerald-500/10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="flex items-start gap-3">
              <svg width="28" height="28" viewBox="0 0 24 24" className="mt-0.5 opacity-80"><path fill="currentColor" d="M10 2h4v2h-1v3.04l5.91 9.85A2 2 0 0 1 17.2 20H6.8a2 2 0 0 1-1.71-3.11L11 7.04V4h-1zM7.2 18h9.6L12 9.7z"/></svg>
              <div>
                <h2 className="text-lg font-semibold leading-tight">{item.nombre}</h2>
                <p className="mt-1 text-sm text-slate-300">
                  <span className="font-medium">Tipo:</span> {item.tipoNombre}
                  {item.capacidad_valor!=null && (
                    <>
                      <span className="mx-2 opacity-40">•</span>
                      <span className="font-medium">Capacidad:</span> {item.capacidad_valor} {item.capacidad_unidad||''}
                    </>
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((t,i)=> <InvTag key={i}>{t}</InvTag>)}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-start gap-2 sm:justify-end">
            <span className={`order-0 inline-flex items-center gap-2 rounded-full border ${item.stock<=5?'border-rose-400/25 bg-rose-500/10 text-rose-300': item.stock<=10?'border-amber-400/25 bg-amber-500/10 text-amber-300':'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'} px-3 py-1 text-sm font-semibold`}>
              Stock: <span>{item.stock}</span>
            </span>
            <div className="order-1 flex items-center gap-1">
              <button onClick={()=> adjustStock(item.idInsumo, +1)} className="rounded-lg bg-slate-800 px-3 py-1 text-sm font-semibold hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/50">+1</button>
              <button onClick={()=> adjustStock(item.idInsumo, -1)} className="rounded-lg bg-slate-800 px-3 py-1 text-sm font-semibold hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-400/50">-1</button>
            </div>
          </div>
        </div>
      </article>
    )
  })

  return (
    <div className="adminx">
      <aside className="sidebar">
        <div className="brand">LabRequests‑UNI</div>
        <nav className="nav">
          <NavLink end to="/admin">Dashboard</NavLink>
          <NavLink to="/admin/solicitudes">Solicitudes</NavLink>
          <NavLink to="/admin/inventario">Inventario</NavLink>
          <NavLink to="/admin/entregas">Entregas</NavLink>
          <NavLink to="/admin/usuarios">Usuarios</NavLink>
          <NavLink to="/admin/reportes">Reportes</NavLink>
        </nav>
        <div className="user">
          <div className="avatar">{(user?.nombres?.[0]||'A')}{(user?.apellidos?.[0]||'D')}</div>
          <div>
            <div style={{fontWeight:900}}>{user?.nombres || 'Admin'}</div>
            <div className="muted" style={{fontSize:12}}>Administrador — Administración</div>
          </div>
        </div>
      </aside>

      <section className="main">
        <header className="topbar">
          <form className="ia-search" onSubmit={handleAiSearch} role="search" aria-label="Buscar" style={{marginLeft:0, marginRight:32}}>
            <input
              type="search"
              placeholder="Asistente IA: Pregunta sobre química, reactivos, inventario, seguridad..."
              value={aiQuery}
              onChange={e=>setAiQuery(e.target.value)}
              disabled={aiLoading}
              autoComplete="off"
            />
            <button type="submit" aria-label="Enviar" disabled={aiLoading}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M3 12l18-9-6 9 6 9-18-9z"/>
              </svg>
            </button>
          </form>
          {aiShow && (
            <div ref={aiRef} style={{position:'fixed', top:90, right:40, zIndex:9999, background:'rgba(24,30,42,0.98)', color:'#e5e7eb', borderRadius:18, boxShadow:'0 8px 32px #0008', padding:'28px 32px', minWidth:340, maxWidth:420, maxHeight:'60vh', overflowY:'auto', border:'1px solid #232a3a', animation:'fadeIn .3s'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                <strong style={{fontSize:18, color:'#a5b4fc'}}>Asistente IA</strong>
                <button onClick={()=>{
                  setAiShow(false);
                  setAiQuery('');
                  setAiAnswer('');
                  setAiTyped('');
                  setAiLoading(false);
                }} style={{background:'none', border:'none', color:'#e5e7eb', fontSize:22, cursor:'pointer', fontWeight:700, marginLeft:10}}>×</button>
              </div>
              <div style={{fontSize:15, lineHeight:1.7}}>
                <ReactMarkdown>{aiTyped || '...'}</ReactMarkdown>
                {aiLoading && <span style={{fontSize:13, color:'#93c5fd'}}>Pensando…</span>}
              </div>
            </div>
          )}
          <div className="actions">
            <div className="bell-wrap" ref={bellWrapRef}>
              <div className="bell" onClick={()=> setOpenBell(v=>!v)}>🔔 <span className="badge">{notif}</span></div>
              {openBell && (
                <div className="notif-panel">
                  <div className="notif-head">
                    <span>Notificaciones</span>
                    <button onClick={()=> setNotif(0)} style={{background:'transparent',border:0,color:'#93c5fd',fontWeight:800,cursor:'pointer'}}>Marcar leídas</button>
                  </div>
                  <div className="notif-list">
                    <div className="notif-item"><strong>Aprobación</strong><small>LR‑2025‑0087 aprobada por Logística</small></div>
                    <div className="notif-item"><strong>Nueva solicitud</strong><small>Creada por Dr. Juan Pérez</small></div>
                    <div className="notif-item"><strong>Entrega</strong><small>LR‑2025‑0083 registrada</small></div>
                  </div>
                </div>
              )}
            </div>
            <div className="profile-wrap" ref={menuWrapRef}>
              <button className="profilebtn" onClick={()=> setOpenMenu(v=>!v)}>
                <div className="avatar">{(user?.nombres?.[0]||'A')}{(user?.apellidos?.[0]||'D')}</div>
                <span style={{fontWeight:900}}>{user?.nombres || 'Admin'}</span>
                <span className={`chev ${openMenu?'open':''}`}>▾</span>
              </button>
              {openMenu && (
                <div className="dropdown">
                  <div className="menu">
                    <button onClick={()=> { setOpenMenu(false); navigate('/perfil') }}>Editar Perfil</button>
                    <button onClick={()=> { setOpenMenu(false); navigate('/perfil/clave') }}>Cambiar Contraseña</button>
                    <div className="sep"></div>
                    <button onClick={()=> { setOpenMenu(false); logout(); navigate('/login') }}>Cerrar Sesión</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        

        <div className={`content ${section==='' ? 'cols-2' : ''}`}>
          {section === 'solicitudes' && (
            <div style={{display:'grid', gap:18}}>
              <div className="card">
                <div className="toolbar">
                  <strong>Solicitudes</strong>
                  <select className="sol-filter" value={estadoFilter} disabled={solsLoading}
                    onChange={(e)=>{ const v=e.target.value; setEstadoFilter(v); reloadSolicitudes(v) }}>
                    <option value="">Todos</option>
                    <option>PENDIENTE</option>
                    <option>APROBADA</option>
                    <option>PREPARADA</option>
                    <option>ENTREGADA</option>
                    <option>RECHAZADA</option>
                    <option>CERRADA</option>
                  </select>
                  <button className="btn-sm" disabled={solsLoading} onClick={()=> reloadSolicitudes(estadoFilter)}>{solsLoading? 'Cargando…':'Actualizar'}</button>
                  {solsError && <span className="muted">{solsError}</span>}
                </div>
                <div className="cards">
                  {solsLoading && Array.from({length:6}).map((_,i)=> (
                    <div key={'sk'+i} className="skel-card">
                      <div className="skel-row w60"></div>
                      <div className="skel-row w80"></div>
                      <div className="skel-row w40"></div>
                    </div>
                  ))}
                  {!solsLoading && sols.map(s=> (
                    <div key={s.idSolicitud} className="sol-card">
                      <div className="sol-head">
                        <div className="sol-id">#{s.idSolicitud}</div>
                        <span className={`chip state ${s.estado}`}>{s.estado}</span>
                      </div>
                      <div className="sol-meta">
                        <span>Grupo: <b>{s.idGrupo}</b></span>
                        <span>Solicitante: <b>{s.idUsuario_solicitante}</b></span>
                        <span>Fecha: <b>{new Date(s.fecha).toLocaleDateString()}</b></span>
                      </div>
                      {s.observaciones && <div className="sol-obs">{s.observaciones}</div>}
                      <div className="sol-meta">
                        <span>Aprobada por: <b>{s.aprobada_por||'-'}</b> {s.fecha_aprobacion ? '· '+new Date(s.fecha_aprobacion).toLocaleString() : ''}</span>
                        <span>Entregada por: <b>{s.entregada_por||'-'}</b> {s.fecha_entrega ? '· '+new Date(s.fecha_entrega).toLocaleString() : ''}</span>
                      </div>
                      <div className="sol-actions">
                        <button className="btn-sm">Ver detalle</button>
                        <button className="btn-sm">Imprimir</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card"><h3>Resumen</h3><div className="kpis">{['PENDIENTE','APROBADA','PREPARADA','ENTREGADA','RECHAZADA','CERRADA'].map((s,i)=>{const val=kpis.find(x=>x.estado===s)?.cantidad||0; const cls=['draft','appr','sent','ent','rej','part'][i]||'draft'; const label={PENDIENTE:'Pendiente',APROBADA:'Aprobada',PREPARADA:'Preparada',ENTREGADA:'Entregada',RECHAZADA:'Rechazada',CERRADA:'Cerrada'}[s]; return(<div key={s} className="pill"><span className={`dot ${cls}`}></span> {label} <span className="muted">{val}</span></div>)})}</div></div>
            </div>
          )}
          {section === 'inventario' && (
            <div style={{display:'grid', gap:18}}>
              <div className="card">
                <div className="toolbar" style={{position:'relative', zIndex:2}}>
                  <strong>Inventario</strong>
                  <input className="sol-filter" placeholder="Buscar…" value={invFilters.q} onChange={(e)=> setInvFilters(f=>({...f, q:e.target.value}))} />
                  <select className="sol-filter" value={invFilters.idTipo} onChange={(e)=> setInvFilters(f=>({...f, idTipo:e.target.value}))}>
                    <option value="">Todos los tipos</option>
                    {tipos.length===0 ? <option value="" disabled>(sin tipos)</option> : tipos.map(t=> <option key={t.idTipo} value={t.idTipo}>{t.nombre}</option>)}
                  </select>
                  <label><input type="checkbox" checked={invFilters.prest} onChange={(e)=> setInvFilters(f=>({...f, prest:e.target.checked}))} /> Solo prestables</label>
                  <label><input type="checkbox" checked={invFilters.low} onChange={(e)=> setInvFilters(f=>({...f, low:e.target.checked}))} /> Stock bajo</label>
                  {/* Sin botón Actualizar: live search */}
                  {invSoftLoading && <span className="muted">Cargando…</span>}
                </div>

                {/* Formulario inline para nuevo insumo */}
                <div className="toolbar" style={{flexWrap:'wrap'}}>
                  <button className="btn-sm" onClick={()=> { if (tipos.length===0) loadTipos(); setInvModalOpen(true) }}>+ Nuevo insumo</button>
                </div>

                <div className={`space-y-4 fade ${invSoftLoading ? 'loading':''}`}>
                  {invLoading && Array.from({length:6}).map((_,i)=> (
                    <div key={'sk-inv'+i} className="skel-card">
                      <div className="skel-row w80"></div>
                      <div className="skel-row w60"></div>
                      <div className="skel-row w40"></div>
                    </div>
                  ))}
                  {!invLoading && ins.map(item => (
                    <InvCard key={item.idInsumo} item={item} />
                  ))}
                </div>
              </div>
            </div>
          )}
          {section === 'entregas' && (
            <EntregasSection/>
          )}
          {section === 'usuarios' && (
            <div style={{display:'grid', gap:18}}>
              <div className="card">
                <div className="toolbar" style={{display:'flex', alignItems:'center', gap:12, flexWrap:'wrap'}}>
                  <strong>Usuarios</strong>
                  <input className="input" style={{maxWidth:220}} placeholder="Buscar usuario..." value={usrSearch} onChange={e=>setUsrSearch(e.target.value)} />
                  <button className="btn-primary" onClick={()=>openUserModal()}>+ Nuevo usuario</button>
                </div>
                <div className="overflow-auto rounded-lg border border-slate-800 mt-4">
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
                    {usrLoading ? (
                      <tr><td colSpan={7} className="px-3 py-4 text-center text-slate-400">Cargando usuarios...</td></tr>
                    ) : usrFiltered.length === 0 ? (
                      <tr><td colSpan={7} className="px-3 py-4 text-center text-slate-400">Sin usuarios encontrados.</td></tr>
                    ) : usrFiltered.map(u => (
                      <tr key={u.idUsuario} className="odd:bg-slate-900/40">
                        <td className="px-3 py-2 border-b border-slate-800">{u.idUsuario}</td>
                        <td className="px-3 py-2 border-b border-slate-800">{u.nombres} {u.apellidos}</td>
                        <td className="px-3 py-2 border-b border-slate-800">{u.correo}</td>
                        <td className="px-3 py-2 border-b border-slate-800">{roles.find(r => r.idRol === u.idRol)?.nombre === 'Logística' ? 'Laboratorista' : roles.find(r => r.idRol === u.idRol)?.nombre || ''}</td>
                        <td className="px-3 py-2 border-b border-slate-800">{u.estado||''}</td>
                        <td className="px-3 py-2 border-b border-slate-800">{u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString(): ''}</td>
                        <td className="px-3 py-2 border-b border-slate-800">
                          <div className="flex gap-2">
                            <button title="Editar" className="btn-secondary" onClick={()=>openUserModal(u)}>Editar</button>
                            <button title="Eliminar" className="btn-danger" onClick={()=>delUser(u.idUsuario)}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {section === 'reportes' && (
            <div style={{display:'grid', gap:18}}>
              <div className="card"><h3>Reportes</h3><p className="muted">Reportes de uso de insumos, prácticas por curso y balance diario.</p></div>
            </div>
          )}

          {!section && (
          <div style={{display:'grid', gap:18}}>
            <div className="card" style={{transition:'transform .12s ease, box-shadow .2s ease'}}>
              <h3>Solicitudes por Estado</h3>
              <div className="kpis">
                {['PENDIENTE','APROBADA','PREPARADA','ENTREGADA','RECHAZADA','CERRADA'].map((s,i)=>{
                  const val = kpis.find(x=> x.estado===s)?.cantidad || 0
                  const cls = ['draft','appr','sent','ent','rej','part'][i] || 'draft'
                  const label = {PENDIENTE:'Pendiente',APROBADA:'Aprobada',PREPARADA:'Preparada',ENTREGADA:'Entregada',RECHAZADA:'Rechazada',CERRADA:'Cerrada'}[s]
                  return (<div key={s} className="pill"><span className={`dot ${cls}`}></span> {label} <span className="muted">{val}</span></div>)
                })}
              </div>
              <div className="chart">
                {(() => {
                  const order = ['PENDIENTE','APROBADA','PREPARADA','ENTREGADA','RECHAZADA','CERRADA']
                  const labelsFull = {
                    PENDIENTE:'PENDIENTE', APROBADA:'APROBADA', PREPARADA:'PREPARADA',
                    ENTREGADA:'ENTREGADA', RECHAZADA:'RECHAZADA', CERRADA:'CERRADA'
                  }
                  const classMap = ['draft','appr','sent','ent','rej','part']
                  const colorByClass = {
                    draft:'#334155', sent:'#60a5fa', appr:'#34d399', ent:'#10b981', rej:'#f87171', part:'#fbbf24'
                  }
                  const data = order.map((s, i)=> ({
                    key: s,
                    label: labelsFull[s],
                    total: (kpis.find(x=> x.estado===s)?.cantidad || 0),
                    color: colorByClass[classMap[i]] || '#e5e7eb'
                  }))
                  const max = Math.max(1, ...data.map(d=> d.total))
                  const height = 220
                  const baseY = 200
                  const xStart = 45
                  const gap = 60
                  const barW = 34
                  return (
                    <svg viewBox="0 0 420 240" preserveAspectRatio="xMidYMid meet">
                      <g stroke="#1f2a44">
                        <line x1="30" y1="190" x2="410" y2="190" />
                        <line x1="30" y1="140" x2="410" y2="140" />
                        <line x1="30" y1="90"  x2="410" y2="90" />
                      </g>
                      {data.map((d,i)=>{
                        const h = Math.max(6, Math.round((d.total/max) * (height-40)))
                        const x = xStart + i*gap
                        const y = baseY - h
                        const cx = x + barW/2
                        return (
                          <g key={d.key}>
                            <rect x={x} y={y} width={barW} height={h} rx="8" fill={d.color} />
                            <text x={cx} y={220} fontSize="12" fill="#cbd5e1" textAnchor="middle" transform={`rotate(-20 ${cx} 220)`}>{d.label}</text>
                          </g>
                        )
                      })}
                    </svg>
                  )
                })()}
              </div>
            </div>

            <div className="card" style={{transition:'transform .12s ease, box-shadow .2s ease'}}>
              <h3>Próximas Prácticas</h3>
              <table>
                <thead>
                  <tr><th>Curso</th><th>Fecha</th><th>Responsable</th><th>Tema</th></tr>
                </thead>
                <tbody>
                  {upcoming.map(r => (
                    <tr key={r.idEvaluacion}><td>{r.curso}</td><td>{new Date(r.fecha_inicio).toLocaleDateString()}</td><td>-</td><td>{r.descripcion||r.tipo}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {!section && (
          <div style={{display:'grid', gap:18}}>
            <div className="card" style={{transition:'transform .12s ease, box-shadow .2s ease'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                <h3 style={{margin:0}}>Stock Bajo</h3>
                <Link to="/admin/inventario" style={{color:'#93c5fd', fontWeight:900}}>Ver inventario →</Link>
              </div>
              {low.length === 0 ? (
                <p className="muted">Sin alertas de stock bajo.</p>
              ) : (
                <div className="list">
                  {low.slice(0,8).map((x,i)=> {
                    const cls = x.stock<=5 ? 'border-rose-400/25 bg-rose-500/10 text-rose-300' : 'border-amber-400/25 bg-amber-500/10 text-amber-300'
                    const label = x.stock<=5 ? 'Crítico' : 'Bajo'
                    return (
                      <div key={x.nombre+String(i)} className="item">
                        <div>{x.nombre} <span className="muted">· stock {x.stock}</span></div>
                        <span className={`rounded-full border ${cls} px-3 py-1 text-sm font-semibold`}>{label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="card" style={{transition:'transform .12s ease, box-shadow .2s ease'}}>
              <h3>Últimas Actividades</h3>
              <div className="activities">
                {acts.map((a,i)=> (
                  <div key={i} className="act"><time>{a.when}</time> <div><div className="what">{a.what}</div><div className="muted">Sistema</div></div></div>
                ))}
              </div>
            </div>
          </div>
          )}
        </div>
      </section>

      {invModalOpen && (
        <div className="modal-backdrop" onClick={(e)=> { if (e.target===e.currentTarget) setInvModalOpen(false) }}>
          <div className="modal">
            <h3>Nuevo insumo</h3>
            <div className="grid">
              <input placeholder="ID" value={newIns.idInsumo} onChange={e=> setNewIns(v=>({...v, idInsumo:e.target.value}))} />
              <input placeholder="Nombre" value={newIns.nombre} onChange={e=> setNewIns(v=>({...v, nombre:e.target.value}))} />
              <select value={newIns.idTipo} onChange={e=> setNewIns(v=>({...v, idTipo:e.target.value}))} onFocus={()=> { if (tipos.length===0) loadTipos() }}>
                <option value="">Tipo…</option>
                {tipos.length===0 ? <option value="" disabled>(cargando tipos…)</option> : tipos.map(t=> <option key={t.idTipo} value={t.idTipo}>{t.nombre}</option>)}
              </select>
              <input type="number" placeholder="Stock" value={newIns.stock} onChange={e=> setNewIns(v=>({...v, stock:e.target.value}))} />
              <input type="number" step="0.01" placeholder="Capacidad" value={newIns.capacidad_valor} onChange={e=> setNewIns(v=>({...v, capacidad_valor:e.target.value}))} />
              <input placeholder="Unidad" value={newIns.capacidad_unidad} onChange={e=> setNewIns(v=>({...v, capacidad_unidad:e.target.value}))} />
              <label style={{display:'flex', alignItems:'center', gap:6}}><input type="checkbox" checked={newIns.es_prestable} onChange={e=> setNewIns(v=>({...v, es_prestable:e.target.checked}))} /> Prestable</label>
            </div>
            <div className="actions">
              <button className="btn-sm" onClick={()=> setInvModalOpen(false)}>Cancelar</button>
              <button className="btn-sm" disabled={invSaving || !newIns.idInsumo || !newIns.nombre || !newIns.idTipo}
                onClick={async ()=> { setInvSaving(true); try { await api.post('/api/insumos', { ...newIns, stock: Number(newIns.stock)||0, capacidad_valor: newIns.capacidad_valor!==''? Number(newIns.capacidad_valor): null }); setInvModalOpen(false); setNewIns({ idInsumo:'', nombre:'', idTipo:'', stock:0, capacidad_valor:'', capacidad_unidad:'', es_prestable:false }); await loadInsumos() } catch{} finally { setInvSaving(false) } }}>
                {invSaving? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {usrModalOpen && (
        <div className="modal-backdrop" onClick={(e)=> { if (e.target===e.currentTarget) setUsrModalOpen(false) }}>
          <div className="modal">
            <h3>{usrEditing? 'Editar usuario' : 'Nuevo usuario'}</h3>
            <div className="grid">
              <input name="idUsuario" placeholder="ID" value={usrForm.idUsuario} onChange={onUsrChange} disabled={usrEditing} />
              <select name="idRol" value={usrForm.idRol||''} onChange={onUsrChange}>
                <option value="">(sin rol)</option>
                {roles.map(r=> <option key={r.idRol} value={r.idRol}>{r.nombre}</option>)}
              </select>
              <input name="nombres" placeholder="Nombres" value={usrForm.nombres} onChange={onUsrChange} />
              <input name="apellidos" placeholder="Apellidos" value={usrForm.apellidos} onChange={onUsrChange} />
              <input name="correo" placeholder="Correo" value={usrForm.correo} onChange={onUsrChange} />
              <input name="telefono" placeholder="Teléfono" value={usrForm.telefono||''} onChange={onUsrChange} />
              <select name="estado" value={usrForm.estado||'Activo'} onChange={onUsrChange}>
                <option>Activo</option>
                <option>Inactivo</option>
                <option>Suspendido</option>
              </select>
              {usrEditing && (
                <input name="clave" placeholder="Clave (opcional para cambiar)" type="password" value={usrForm.clave||''} onChange={onUsrChange} />
              )}
            </div>
            <div className="actions">
              <button className="btn-sm" onClick={()=> setUsrModalOpen(false)}>Cancelar</button>
              <button className="btn-sm" disabled={usrSaving || (!usrEditing && (!usrForm.idUsuario || !usrForm.nombres || !usrForm.apellidos || !usrForm.correo || !usrForm.idRol || !usrForm.estado))} onClick={saveUser}>{usrSaving? 'Guardando…':'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EntregasSection(){
  const [items, setItems] = useState([])
  const [estado, setEstado] = useState('ACTIVOS')
  const [loading, setLoading] = useState(false)
  const [idInsumo, setIdInsumo] = useState('')
  const [idSolicitud, setIdSolicitud] = useState('')

  async function load(){
    const qs = new URLSearchParams(); if (estado) qs.set('estado', estado); if (idInsumo) qs.set('idInsumo', idInsumo); if (idSolicitud) qs.set('idSolicitud', idSolicitud)
    setLoading(true)
    try{ const data = await api.get('/api/prestamos?'+qs.toString()); setItems(data) } catch{} finally { setLoading(false) }
  }
  useEffect(()=>{ load() },[])

  async function marcarDevuelto(id){ try{ await api.post(`/api/prestamos/${encodeURIComponent(id)}/devolver`, {}); await load() } catch{} }

  return (
    <div style={{display:'grid', gap:18}}>
      <div className="card">
        <div className="toolbar">
          <strong>Entregas</strong>
          <select className="sol-filter" value={estado} onChange={(e)=> setEstado(e.target.value)}>
            <option>ACTIVOS</option>
            <option>VENCIDOS</option>
            <option>DEVUELTOS</option>
          </select>
          <input className="sol-filter" placeholder="idInsumo" value={idInsumo} onChange={e=> setIdInsumo(e.target.value)} />
          <input className="sol-filter" placeholder="idSolicitud" value={idSolicitud} onChange={e=> setIdSolicitud(e.target.value)} />
          <button className="btn-sm" disabled={loading} onClick={load}>{loading? 'Cargando…' : 'Actualizar'}</button>
        </div>
        <div className="cards">
          {loading && Array.from({length:6}).map((_,i)=> (
            <div key={'sk-pre'+i} className="skel-card"><div className="skel-row w60"></div><div className="skel-row w80"></div><div className="skel-row w40"></div></div>
          ))}
          {!loading && items.map(p => (
            <div key={p.idPrestamo} className="ins-card">
              <div className="ins-head"><div style={{fontWeight:900}}>Préstamo {p.idPrestamo}</div><span className={`badge ${p.devuelto? 'stock ok' : 'stock low'}`}>{p.devuelto? 'DEVUELTO':'ACTIVO'}</span></div>
              <div className="sol-meta">
                <span>Solicitud: <b>{p.idSolicitud}</b></span>
                <span>Insumo: <b>{p.idInsumo}</b></span>
                <span>Cantidad: <b>{p.cantidad}</b></span>
              </div>
              <div className="sol-meta">
                <span>Prestamo: <b>{new Date(p.fecha_prestamo).toLocaleDateString()}</b></span>
                <span>Compromiso: <b>{p.fecha_compromiso ? new Date(p.fecha_compromiso).toLocaleDateString(): '-'}</b></span>
                <span>Devolución: <b>{p.fecha_devolucion ? new Date(p.fecha_devolucion).toLocaleDateString(): '-'}</b></span>
              </div>
              {!p.devuelto && <div className="ins-actions"><button className="btn-sm" onClick={()=> marcarDevuelto(p.idPrestamo)}>Marcar devuelto</button></div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Modal de usuarios
// Se inserta al final del componente AdminDashboard (señal: justo antes del cierre del wrapper principal)

// Modal for new insumo (rendered inside AdminDashboard root)
