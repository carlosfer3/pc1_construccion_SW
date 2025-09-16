import sql from 'mssql'
import dotenv from 'dotenv'

dotenv.config()
const usuario = process.env.DB_USER
const password = process.env.DB_PASSWORD
const serverEnv = process.env.DB_SERVER || 'localhost'
const port = Number(process.env.DB_PORT) || 1433
const database = process.env.DB_DATABASE

// Soporte para instancias con nombre: DB_SERVER=HOST\INSTANCIA
let host = serverEnv
let instanceName
if (serverEnv.includes('\\')) {
    const parts = serverEnv.split('\\')
    host = parts[0]
    instanceName = parts[1]
}

const config = {
    user: usuario,
    password: password,
    server: host,
    database: database,
    // Si se especifica una instancia, el puerto suele resolverse automáticamente
    ...(instanceName ? {} : { port }),
    options: {
        encrypt: true,
        trustServerCertificate: true,
        ...(instanceName ? { instanceName } : {})
    }
}

let pool = null

async function getConnection () {
    if (pool) return pool

    try {
        pool = await sql.connect(config)
        console.log(`Conexion establecida a ${database} en ${host}${instanceName ? '\\' + instanceName : ''}${instanceName ? '' : ':' + port}`)

        return pool
    }   catch (err) {
        console.log(`Error al conectarse a la base de datos ${database}`)
        console.error(err)
        throw err
    }
}

export { sql }
export default getConnection
