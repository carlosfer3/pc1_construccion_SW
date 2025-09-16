export default function Dashboard(){
  const card = 'block rounded-xl border border-slate-800 bg-slate-900/40 p-4 hover:border-cyan-400 transition-colors'
  const muted = 'text-slate-400 text-sm'
  return (
    <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
      <a className={card} href="/usuarios"><h3 className="font-semibold mb-1">Usuarios</h3><p className={muted}>CRUD y roles</p></a>
      <a className={card} href="/practicas"><h3 className="font-semibold mb-1">Prácticas</h3><p className={muted}>Planificación</p></a>
      <a className={card} href="/solicitudes"><h3 className="font-semibold mb-1">Solicitudes</h3><p className={muted}>Requerimientos</p></a>
      <a className={card} href="/inventario"><h3 className="font-semibold mb-1">Inventario</h3><p className={muted}>Insumos y equipos</p></a>
      <a className={card} href="/reportes"><h3 className="font-semibold mb-1">Reportes</h3><p className={muted}>Uso y balances</p></a>
    </section>
  )
}
