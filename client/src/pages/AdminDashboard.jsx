import { useEffect, useRef, useState } from 'react'
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
  const [estadoFilter, setEstadoFilter] = useState('')
  const reqIdRef = useRef(0)

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

  // Auto refresco de KPIs (cada 20s)
  useEffect(()=>{
    const id = setInterval(()=> { refreshKpis() }, 20000)
    return ()=> clearInterval(id)
  },[])

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
          <div className="search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 21l-4.35-4.35" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" opacity=".6"/><circle cx="10.5" cy="10.5" r="6.5" stroke="#cbd5e1" strokeWidth="1.6" opacity=".6"/></svg>
            <input placeholder="Buscar solicitudes, insumos…" />
          </div>
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
        

        <div className="content">
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
              <div className="card"><h3>Inventario</h3><div className="list">{low.map((x,i)=>(<div key={i} className="item"><div>{x.nombre} <span className="muted">· stock {x.stock}</span></div><span className={x.stock<5?'chip bad':'chip low'}>{x.stock<5?'Crítico':'Bajo'}</span></div>))}</div></div>
              <div className="card"><h3>Acciones rápidas</h3><p className="muted">Registrar insumo, actualizar stock, importar CSV…</p></div>
            </div>
          )}
          {section === 'entregas' && (
            <div style={{display:'grid', gap:18}}>
              <div className="card"><h3>Entregas</h3><p className="muted">Preparación, entrega y devoluciones.</p></div>
              <div className="card"><h3>Últimas Actividades</h3><div className="activities">{acts.map((a,i)=> (<div key={i} className="act"><time>{a.when}</time> <div><div className="what">{a.what}</div><div className="muted">Sistema</div></div></div>))}</div></div>
            </div>
          )}
          {section === 'usuarios' && (
            <div style={{display:'grid', gap:18}}>
              <div className="card"><h3>Usuarios</h3><p className="muted">Administración de usuarios y roles.</p><Link to="/usuarios" style={{color:'#93c5fd', fontWeight:900}}>Ir al módulo de Usuarios →</Link></div>
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
              <h3>Stock Bajo</h3>
              <div className="list">
                {low.map((x,i)=> (
                  <div key={i} className="item"><div>{x.nombre} <span className="muted">· stock {x.stock}</span></div><span className={x.stock<5? 'chip bad':'chip low'}>{x.stock<5?'Crítico':'Bajo'}</span></div>
                ))}
              </div>
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
    </div>
  )
}
