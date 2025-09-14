import sql from 'mssql'
import dotenv from 'dotenv'

dotenv.config()
const usuario = process.env.DB_USER
const password = process.env.DB_PASSWORD
const server = process.env.DB_SERVER
const database = process.env.DB_DATABASE

const config = {
    user: usuario,
    password: password,
    server: server,
    database: database,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
}

let pool = null

async function getConnection () {
    if (pool) return pool

    try {
        pool = await sql.connect(config)
        console.log(`Conexion establecida con la base de datos ${database}`)

        return pool
    }   catch (err) {
        console.log(`Error al conectarse a la base de datos ${database}`)
        throw err
    }
}

export default getConnection