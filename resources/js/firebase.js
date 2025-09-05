// Inicializa Firebase usando módulos ESM desde CDN y expone helpers.
import { firebaseConfig } from './firebase-config.js'

// Importaciones ESM desde el CDN oficial de Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
import { getDatabase, ref, push, set } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js'

let app
let db

function getApp() {
  if (!app) {
    app = initializeApp(firebaseConfig)
  }
  return app
}

function getDb() {
  if (!db) {
    db = getDatabase(getApp())
  }
  return db
}

// Guarda un pedido en RTDB bajo la colección 'pedidos'
export async function savePedido(data) {
  const database = getDb()
  const pedidosRef = ref(database, 'pedidos')
  const nuevoRef = push(pedidosRef)
  await set(nuevoRef, data)
  return { key: nuevoRef.key }
}

