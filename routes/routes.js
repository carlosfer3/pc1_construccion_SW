import { Router } from "express";
import getConnection, { sql } from "../config/db.js";
import bcrypt from 'bcryptjs'

const router = Router();

// Healthcheck app
router.get("/health", (req, res) => {
  res.json({ ok: true, service: "api", ts: new Date().toISOString() });
});

// Healthcheck DB
router.get("/health/db", async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT GETDATE() as now");
    res.json({ ok: true, now: result.recordset?.[0]?.now });
  } catch (err) {
    console.error("DB health error:", err);
    res.status(500).json({ ok: false, error: "DB connection failed" });
  }
});

// Ejemplo: listar usuarios (ajusta tabla/columnas según tu esquema)
router.get("/usuarios", async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .query(
        "SELECT TOP 50 idUsuario, nombres, apellidos, correo, idRol, estado, ultimo_acceso FROM usuarios ORDER BY ultimo_acceso DESC"
      );
    res.json(result.recordset);
  } catch (err) {
    console.error("Error consultando usuarios:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// Ejemplo: buscar usuario por correo (parametrizado)
router.get("/usuarios/by-correo", async (req, res) => {
  const correo = req.query.correo;
  if (!correo) return res.status(400).json({ error: "Falta ?correo" });
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("correo", sql.VarChar(120), String(correo))
      .query(
        "SELECT idUsuario, nombres, apellidos, correo, idRol, estado, ultimo_acceso FROM usuarios WHERE correo = @correo"
      );
    res.json(result.recordset);
  } catch (err) {
    console.error("Error consultando usuario por correo:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

export default router;

// ----- Usuarios CRUD -----
router.post("/usuarios", async (req, res) => {
  const {
    idUsuario,
    nombres,
    apellidos,
    correo,
    telefono = null,
    clave,
    idRol,
    estado,
  } = req.body || {}
  if (!idUsuario || !nombres || !apellidos || !correo || !clave || !idRol || !estado) {
    return res.status(400).json({ error: "Campos obligatorios: idUsuario, nombres, apellidos, correo, clave, idRol, estado" })
  }
  try {
    const pool = await getConnection()
    const hash = await bcrypt.hash(String(clave), 10)
    await pool.request()
      .input('idUsuario', sql.VarChar(10), String(idUsuario))
      .input('nombres', sql.VarChar(50), String(nombres))
      .input('apellidos', sql.VarChar(60), String(apellidos))
      .input('correo', sql.VarChar(120), String(correo))
      .input('telefono', sql.VarChar(9), telefono ? String(telefono) : null)
      .input('clave', sql.VarChar(72), hash)
      .input('idRol', sql.VarChar(10), String(idRol))
      .input('estado', sql.VarChar(12), String(estado))
      .query(`INSERT INTO usuarios (idUsuario, nombres, apellidos, correo, telefono, clave, idRol, estado, ultimo_acceso)
              VALUES (@idUsuario, @nombres, @apellidos, @correo, @telefono, @clave, @idRol, @estado, GETDATE())`)
    res.status(201).json({ ok: true })
  } catch (err) {
    console.error('Crear usuario error:', err)
    const detail = process.env.DEBUG_ERRORS ? (err?.originalError?.info?.message || err?.message || String(err)) : undefined
    res.status(500).json({ error: 'Error al crear usuario', ...(detail ? { detail } : {}) })
  }
})

router.put('/usuarios/:id', async (req, res) => {
  const { id } = req.params
  const { nombres, apellidos, correo, telefono, clave, idRol, estado } = req.body || {}
  try {
    const pool = await getConnection()
    const request = pool.request()
      .input('id', sql.VarChar(10), String(id))
      .input('nombres', sql.VarChar(50), nombres ?? null)
      .input('apellidos', sql.VarChar(60), apellidos ?? null)
      .input('correo', sql.VarChar(120), correo ?? null)
      .input('telefono', sql.VarChar(9), telefono ?? null)
      .input('idRol', sql.VarChar(10), idRol ?? null)
      .input('estado', sql.VarChar(12), estado ?? null)
    let sqlUpdate = `UPDATE usuarios SET 
              nombres = ISNULL(@nombres, nombres),
              apellidos = ISNULL(@apellidos, apellidos),
              correo = ISNULL(@correo, correo),
              telefono = ISNULL(@telefono, telefono),
              idRol = ISNULL(@idRol, idRol),
              estado = ISNULL(@estado, estado)`
    if (clave) {
      const hash = await bcrypt.hash(String(clave), 10)
      request.input('clave', sql.VarChar(72), hash)
      sqlUpdate += ', clave = @clave'
    }
    sqlUpdate += ' WHERE idUsuario = @id'
    await request.query(sqlUpdate)
    res.json({ ok: true })
  } catch (err) {
    console.error('Actualizar usuario error:', err)
    res.status(500).json({ error: 'Error al actualizar usuario' })
  }
})

router.delete('/usuarios/:id', async (req, res) => {
  const { id } = req.params
  try {
    const pool = await getConnection()
    const tx = new sql.Transaction(pool)
    await tx.begin()
    const rq = new sql.Request(tx)
    rq.input('id', sql.VarChar(10), String(id))

    // 1) Limpiar referencias que aceptan NULL
    await rq.query(`
      UPDATE solicitud SET aprobada_por = NULL WHERE aprobada_por = @id;
      UPDATE solicitud SET entregada_por = NULL WHERE entregada_por = @id;
      UPDATE insumos_solicitados SET entregada_por = NULL WHERE entregada_por = @id;
      UPDATE insumos_solicitados SET recibida_por = NULL WHERE recibida_por = @id;
    `)

    // 2) Eliminar jerarquía de solicitudes donde es solicitante (primero hijos)
    await rq.query(`
      DELETE ips
      FROM insumos_prestados ips
      WHERE ips.idSolicitud IN (SELECT s.idSolicitud FROM solicitud s WHERE s.idUsuario_solicitante = @id);

      DELETE iss
      FROM insumos_solicitados iss
      WHERE iss.idSolicitud IN (SELECT s.idSolicitud FROM solicitud s WHERE s.idUsuario_solicitante = @id);

      DELETE s
      FROM solicitud s
      WHERE s.idUsuario_solicitante = @id;
    `)

    // 3) Eliminar préstamos donde participa el usuario (por si quedaron otros préstamos)
    await rq.query(`
      DELETE FROM insumos_prestados WHERE entregado_por=@id OR idUsuario_receptor=@id;
    `)

    // 4) Otras referencias directas
    await rq.query(`
      DELETE FROM reportes_danho WHERE idUsuario=@id;
      DELETE FROM profesores_cursos WHERE idUsuario=@id;
      DELETE FROM grupos_alumnos WHERE idUsuario=@id;
    `)

    // 5) Finalmente, eliminar usuario
    await rq.query('DELETE FROM usuarios WHERE idUsuario = @id')

    await tx.commit()
    res.json({ ok: true, action: 'deleted' })
  } catch (err) {
    console.error('Eliminar usuario error:', err)
    res.status(500).json({ error: 'Error al eliminar usuario' })
  }
})

// Roles
router.get('/roles', async (req, res) => {
  try {
    const pool = await getConnection()
    const r = await pool.request().query('SELECT idRol, nombre FROM rol ORDER BY nombre')
    res.json(r.recordset)
  } catch (err) {
    console.error('Listar roles error:', err)
    res.status(500).json({ error: 'Error al listar roles' })
  }
})

router.put('/usuarios/:id/rol', async (req, res) => {
  const { id } = req.params
  const { idRol } = req.body || {}
  if (!idRol) return res.status(400).json({ error: 'Falta idRol' })
  try {
    const pool = await getConnection()
    await pool.request()
      .input('id', sql.VarChar(10), String(id))
      .input('idRol', sql.VarChar(10), String(idRol))
      .query('UPDATE usuarios SET idRol = @idRol WHERE idUsuario = @id')
    res.json({ ok: true })
  } catch (err) {
    console.error('Asignar rol error:', err)
    res.status(500).json({ error: 'Error al asignar rol' })
  }
})

// ---- Auth ----
router.post('/auth/login', async (req, res) => {
  const { correo, clave } = req.body || {}
  if (!correo || !clave) return res.status(400).json({ error: 'correo y clave son obligatorios' })
  try {
    const pool = await getConnection()
    const r = await pool.request()
      .input('correo', sql.VarChar(120), String(correo))
      .query('SELECT TOP 1 idUsuario, nombres, apellidos, correo, clave, idRol, estado FROM usuarios WHERE correo = @correo')
    if (!r.recordset.length) return res.status(401).json({ error: 'Credenciales inválidas' })
    const u = r.recordset[0]
    const ok = await bcrypt.compare(String(clave), u.clave)
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' })
    await pool.request().input('id', sql.VarChar(10), u.idUsuario).query('UPDATE usuarios SET ultimo_acceso = GETDATE() WHERE idUsuario=@id')
    // Nota: Para producción, firma un JWT y aplícalo como Authorization.
    // Verificar si la clave es la inicial 'admin'
    let requiereCambioClave = false
    if (await bcrypt.compare('admin', u.clave)) {
      requiereCambioClave = true
    }
    res.json({ token: 'dev-token', user: { idUsuario: u.idUsuario, nombres: u.nombres, apellidos: u.apellidos, correo: u.correo, idRol: u.idRol }, requiereCambioClave })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
})

// ---- Perfil ----
// Obtener perfil por id
router.get('/profile/:id', async (req, res) => {
  const { id } = req.params
  try {
    const pool = await getConnection()
    const r = await pool.request()
      .input('id', sql.VarChar(10), String(id))
      .query('SELECT idUsuario, nombres, apellidos, correo, telefono, idRol, estado, ultimo_acceso FROM usuarios WHERE idUsuario=@id')
    if (!r.recordset.length) return res.status(404).json({ error: 'No encontrado' })
    res.json(r.recordset[0])
  } catch (err) {
    console.error('Perfil get error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
})

// Actualizar perfil (nombres, apellidos, telefono, correo)
router.put('/profile/:id', async (req, res) => {
  const { id } = req.params
  const { nombres, apellidos, telefono, correo } = req.body || {}
  try {
    const pool = await getConnection()
    await pool.request()
      .input('id', sql.VarChar(10), String(id))
      .input('nombres', sql.VarChar(50), nombres ?? null)
      .input('apellidos', sql.VarChar(60), apellidos ?? null)
      .input('telefono', sql.VarChar(9), telefono ?? null)
      .input('correo', sql.VarChar(120), correo ?? null)
      .query(`UPDATE usuarios SET 
              nombres = ISNULL(@nombres, nombres),
              apellidos = ISNULL(@apellidos, apellidos),
              telefono = ISNULL(@telefono, telefono),
              correo = ISNULL(@correo, correo)
            WHERE idUsuario=@id`)
    res.json({ ok: true })
  } catch (err) {
    console.error('Perfil update error:', err)
    const detail = process.env.DEBUG_ERRORS ? (err?.originalError?.info?.message || err?.message || String(err)) : undefined
    res.status(500).json({ error: 'Error al actualizar perfil', ...(detail ? { detail } : {}) })
  }
})

// Cambiar contraseña
router.post('/auth/change-password', async (req, res) => {
  const { idUsuario, actual, nueva } = req.body || {}
  if (!idUsuario || !actual || !nueva) return res.status(400).json({ error: 'idUsuario, actual y nueva son obligatorios' })
  try {
    const pool = await getConnection()
    const r = await pool.request().input('id', sql.VarChar(10), String(idUsuario))
      .query('SELECT clave FROM usuarios WHERE idUsuario=@id')
    if (!r.recordset.length) return res.status(404).json({ error: 'Usuario no existe' })
    const ok = await bcrypt.compare(String(actual), r.recordset[0].clave)
    if (!ok) return res.status(401).json({ error: 'Contraseña actual incorrecta' })
    const hash = await bcrypt.hash(String(nueva), 10)
    await pool.request().input('id', sql.VarChar(10), String(idUsuario)).input('clave', sql.VarChar(72), hash)
      .query('UPDATE usuarios SET clave=@clave WHERE idUsuario=@id')
    res.json({ ok: true })
  } catch (err) {
    console.error('Change password error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
})

// ---- Admin Dashboard Data ----
router.get('/admin/kpis', async (_req, res) => {
  try {
    const pool = await getConnection()
    const r = await pool.request().query(`
      SELECT estado, COUNT(*) AS cantidad
      FROM solicitud
      GROUP BY estado
    `)
    res.json(r.recordset)
  } catch (err) {
    console.error('KPIs error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
})

router.get('/admin/upcoming-practices', async (_req, res) => {
  try {
    const pool = await getConnection()
    const r = await pool.request().query(`
      SELECT TOP 6 e.idEvaluacion, c.nombre AS curso, e.fecha_inicio, e.descripcion, e.tipo
      FROM evaluaciones e
      INNER JOIN cursos c ON c.idCurso = e.idCurso
      WHERE e.fecha_inicio >= CAST(GETDATE() AS date)
      ORDER BY e.fecha_inicio ASC
    `)
    res.json(r.recordset)
  } catch (err) {
    console.error('Upcoming practices error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
})

router.get('/admin/low-stock', async (req, res) => {
  try {
    const pool = await getConnection()
    const threshold = Number(req.query.threshold || 5)
    const top = Math.min(Number(req.query.limit) || 12, 100)
    const r = await pool.request()
      .input('th', sql.Int, threshold)
      .query(`
        SELECT TOP (${top}) nombre, stock
        FROM insumos
        WHERE stock <= @th
        ORDER BY stock ASC
      `)
    res.json(r.recordset)
  } catch (err) {
    console.error('Low stock error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
})

router.get('/admin/activities', async (_req, res) => {
  try {
    const pool = await getConnection()
    // Actividades simples basadas en últimas solicitudes y préstamos
    const sol = await pool.request().query(`SELECT TOP 5 idSolicitud, estado, CONVERT(varchar(5), fecha, 108) AS hora FROM solicitud ORDER BY fecha DESC`)
    const acts = sol.recordset.map(s => ({ when: s.hora, what: `Solicitud ${s.idSolicitud} ${s.estado}` }))
    res.json(acts)
  } catch (err) {
    console.error('Activities error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
})

// ---- Solicitudes (CRUD básico: listar)
router.get('/solicitudes', async (req, res) => {
  try {
    const pool = await getConnection()
    const { estado, limit } = req.query || {}
    const top = Math.min(Number(limit) || 100, 500)
    const request = pool.request()
    let where = ''
    if (estado) {
      request.input('estado', sql.VarChar(15), String(estado))
      where = 'WHERE s.estado = @estado'
    }
    const query = `SELECT TOP (${top})
        s.idSolicitud, s.idGrupo, s.idUsuario_solicitante, s.fecha, s.estado,
        s.observaciones, s.aprobada_por, s.fecha_aprobacion, s.entregada_por, s.fecha_entrega
      FROM solicitud s
      ${where}
      ORDER BY s.fecha DESC, s.idSolicitud DESC`
    const r = await request.query(query)
    res.json(r.recordset)
  } catch (err) {
    console.error('List solicitudes error:', err)
    res.status(500).json({ error: 'Error al listar solicitudes' })
  }
})

// Serie mensual de solicitudes (últimos 5-6 meses)
router.get('/admin/monthly-requests', async (_req, res) => {
  try {
    const pool = await getConnection()
    const r = await pool.request().query(`
      WITH base AS (
        SELECT YEAR(fecha) AS y, MONTH(fecha) AS m, COUNT(*) AS total
        FROM solicitud
        GROUP BY YEAR(fecha), MONTH(fecha)
      ),
      recent AS (
        SELECT TOP 6 * FROM base ORDER BY y DESC, m DESC
      )
      SELECT 
        y, m,
        DATENAME(month, DATEFROMPARTS(y, m, 1)) AS monthName,
        total
      FROM recent
      ORDER BY y, m;
    `)
    res.json(r.recordset)
  } catch (err) {
    console.error('Monthly requests error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
})

// ---- Tipos de Insumo ----
router.get('/tipos-insumo', async (_req, res) => {
  try {
    const pool = await getConnection()
    // Algunas bases no tienen columna descripcion; devolvemos solo idTipo y nombre
    const r = await pool.request().query(`
      SELECT t.idTipo, t.nombre, COUNT(i.idInsumo) AS cantidad
      FROM dbo.tipo_insumos t
      LEFT JOIN dbo.insumos i ON i.idTipo = t.idTipo
      GROUP BY t.idTipo, t.nombre
      ORDER BY t.nombre
    `)
    res.json(r.recordset)
  } catch (err) {
    console.error('Tipos insumo error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
})

// ---- Insumos ----
router.get('/insumos', async (req, res) => {
  try {
    const pool = await getConnection()
    const { search, idTipo, prestablesOnly, lowStock, limit } = req.query || {}
    const top = Math.min(Number(limit) || 100, 500)
    const rq = pool.request()
    const where = []
    if (search) {
      rq.input('q', sql.VarChar(120), `%${String(search)}%`)
      where.push(`(
        i.nombre COLLATE SQL_Latin1_General_CP1_CI_AI LIKE @q COLLATE SQL_Latin1_General_CP1_CI_AI
        OR t.nombre COLLATE SQL_Latin1_General_CP1_CI_AI LIKE @q COLLATE SQL_Latin1_General_CP1_CI_AI
      )`)
    }
    if (idTipo) { rq.input('idTipo', sql.VarChar(10), String(idTipo)); where.push('i.idTipo = @idTipo') }
    if (String(prestablesOnly).toLowerCase() === 'true' || prestablesOnly === '1') where.push('i.es_prestable = 1')
    if (String(lowStock).toLowerCase() === 'true' || lowStock === '1') where.push('i.stock <= 5')
    const sqlWhere = where.length ? 'WHERE ' + where.join(' AND ') : ''
    const q = `SELECT TOP (${top}) i.idInsumo, i.nombre, i.idTipo, i.stock, i.capacidad_valor, i.capacidad_unidad, i.es_prestable,
                    t.nombre AS tipoNombre
               FROM insumos i INNER JOIN tipo_insumos t ON t.idTipo = i.idTipo
               ${sqlWhere}
               ORDER BY i.nombre`
    const r = await rq.query(q)
    res.json(r.recordset)
  } catch (err) {
    console.error('List insumos error:', err)
    res.status(500).json({ error: 'Error al listar insumos' })
  }
})

router.post('/insumos', async (req, res) => {
  const { idInsumo, nombre, idTipo, stock = 0, capacidad_valor = null, capacidad_unidad = null, es_prestable = 0 } = req.body || {}
  if (!idInsumo || !nombre || !idTipo) return res.status(400).json({ error: 'idInsumo, nombre e idTipo son obligatorios' })
  try {
    const pool = await getConnection()
    await pool.request()
      .input('id', sql.VarChar(10), String(idInsumo))
      .input('nom', sql.VarChar(100), String(nombre))
      .input('tipo', sql.VarChar(10), String(idTipo))
      .input('stock', sql.Int, Number(stock) || 0)
      .input('cap', sql.Decimal(10,2), capacidad_valor !== null && capacidad_valor !== undefined ? Number(capacidad_valor) : null)
      .input('uni', sql.VarChar(10), capacidad_unidad ? String(capacidad_unidad) : null)
      .input('prest', sql.Bit, es_prestable ? 1 : 0)
      .query(`INSERT INTO insumos (idInsumo, nombre, idTipo, stock, capacidad_valor, capacidad_unidad, es_prestable)
              VALUES (@id, @nom, @tipo, @stock, @cap, @uni, @prest)`)
    res.status(201).json({ ok: true })
  } catch (err) {
    console.error('Crear insumo error:', err)
    res.status(500).json({ error: 'Error al crear insumo' })
  }
})

router.put('/insumos/:id', async (req, res) => {
  const { id } = req.params
  const { nombre, idTipo, stock, capacidad_valor, capacidad_unidad, es_prestable } = req.body || {}
  try {
    const pool = await getConnection()
    const rq = pool.request()
      .input('id', sql.VarChar(10), String(id))
      .input('nom', sql.VarChar(100), nombre ?? null)
      .input('tipo', sql.VarChar(10), idTipo ?? null)
      .input('stock', sql.Int, stock ?? null)
      .input('cap', sql.Decimal(10,2), (capacidad_valor!==undefined? capacidad_valor : null))
      .input('uni', sql.VarChar(10), capacidad_unidad ?? null)
      .input('prest', sql.Bit, (es_prestable===undefined? null : (es_prestable?1:0)))
    await rq.query(`UPDATE insumos SET
        nombre = ISNULL(@nom, nombre),
        idTipo = ISNULL(@tipo, idTipo),
        stock = ISNULL(@stock, stock),
        capacidad_valor = CASE WHEN @cap IS NULL THEN capacidad_valor ELSE @cap END,
        capacidad_unidad = ISNULL(@uni, capacidad_unidad),
        es_prestable = CASE WHEN @prest IS NULL THEN es_prestable ELSE @prest END
      WHERE idInsumo=@id`)
    res.json({ ok: true })
  } catch (err) {
    console.error('Actualizar insumo error:', err)
    res.status(500).json({ error: 'Error al actualizar insumo' })
  }
})

router.patch('/insumos/:id/stock', async (req, res) => {
  const { id } = req.params
  const { delta } = req.body || {}
  if (typeof delta !== 'number') return res.status(400).json({ error: 'delta numérico es obligatorio' })
  try {
    const pool = await getConnection()
    const r = await pool.request()
      .input('id', sql.VarChar(10), String(id))
      .input('d', sql.Int, delta)
      .query(`UPDATE insumos SET stock = CASE WHEN stock + @d < 0 THEN 0 ELSE stock + @d END WHERE idInsumo=@id; SELECT stock FROM insumos WHERE idInsumo=@id`)
    res.json({ ok: true, stock: r.recordset[0]?.stock })
  } catch (err) {
    console.error('Ajuste stock error:', err)
    res.status(500).json({ error: 'Error al ajustar stock' })
  }
})

// ---- Prestamos (Entregas) ----
router.get('/prestamos', async (req, res) => {
  try {
    const pool = await getConnection()
    const { estado, idInsumo, idSolicitud, desde, hasta, limit } = req.query || {}
    const top = Math.min(Number(limit) || 100, 500)
    const rq = pool.request()
    const clauses = []
    if (estado === 'ACTIVOS') clauses.push('p.devuelto = 0')
    else if (estado === 'DEVUELTOS') clauses.push('p.devuelto = 1')
    else if (estado === 'VENCIDOS') clauses.push('p.devuelto = 0 AND p.fecha_compromiso < CAST(GETDATE() AS date)')
    if (idInsumo) { rq.input('idInsumo', sql.VarChar(10), String(idInsumo)); clauses.push('p.idInsumo=@idInsumo') }
    if (idSolicitud) { rq.input('idSolicitud', sql.VarChar(10), String(idSolicitud)); clauses.push('p.idSolicitud=@idSolicitud') }
    if (desde) { rq.input('desde', sql.Date, new Date(desde)); clauses.push('p.fecha_prestamo >= @desde') }
    if (hasta) { rq.input('hasta', sql.Date, new Date(hasta)); clauses.push('p.fecha_prestamo <= @hasta') }
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''
    const r = await rq.query(`
      SELECT TOP (${top}) p.idPrestamo, p.idSolicitud, p.idInsumo, p.cantidad, p.entregado_por, p.idUsuario_receptor,
             p.fecha_prestamo, p.fecha_compromiso, p.fecha_devolucion, p.devuelto
      FROM insumos_prestados p
      ${where}
      ORDER BY p.fecha_prestamo DESC, p.idPrestamo DESC`)
    res.json(r.recordset)
  } catch (err) {
    console.error('List prestamos error:', err)
    res.status(500).json({ error: 'Error al listar préstamos' })
  }
})

router.post('/prestamos/:id/devolver', async (req, res) => {
  const { id } = req.params
  const { fecha_devolucion } = req.body || {}
  try {
    const pool = await getConnection()
    await pool.request()
      .input('id', sql.VarChar(12), String(id))
      .input('fdev', sql.Date, fecha_devolucion ? new Date(fecha_devolucion) : new Date())
      .query('UPDATE insumos_prestados SET devuelto = 1, fecha_devolucion = @fdev WHERE idPrestamo=@id')
    res.json({ ok: true })
  } catch (err) {
    console.error('Devolver préstamo error:', err)
    res.status(500).json({ error: 'Error al devolver préstamo' })
  }
})
