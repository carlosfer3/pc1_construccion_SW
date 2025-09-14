//importaciones necesarias
import express from 'express'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'

//usamos las variables globales del sistema
dotenv.config() 
const puerto = process.env.PUERTO

//usamos express
const app = express()

//middlewares para el proyecto
app.use(bodyParser.json())
app.use(bodyParser.urlencoded( { extended: true }))
app.use(express.static('resources'))
app.set("view engine", "ejs");

//iniciamos el servidor
app.listen(puerto, () => {
    console.log(`Servidor iniciado en el puerto ${puerto}`)
})