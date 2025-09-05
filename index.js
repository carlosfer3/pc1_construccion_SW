import express from 'express'
import bodyParser from 'body-parser'
import 'dotenv/config'

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded( { extended: true }))
app.use(express.static('resources'))
app.set("view engine", "ejs");


app.get('/', (req, res) => {
    res.render('formulario')
})

app.get('/save', (req,res) => {
    
})

app.listen(3000, () => {
    console.log(`Servidor iniciado en el puerto ${3000}`)
})