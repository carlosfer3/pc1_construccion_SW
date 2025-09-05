// Inicializa Firebase usando módulos ESM desde CDN y expone helpers.
import { firebaseConfig } from './firebase-config.js'

// Importaciones ESM desde el CDN oficial de Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
import { getFirestore, collection, addDoc, doc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js'

let app
let fs

function getApp() {
  if (!app) {
    app = initializeApp(firebaseConfig)
  }
  return app
}

function getFs() {
  if (!fs) {
    fs = getFirestore(getApp())
  }
  return fs
}

// Guarda un pedido en Firestore en la colección 'pedidos'
export async function savePedido(data) {
  const db = getFs()
  const col = collection(db, 'pedidos')
  const docRef = await addDoc(col, { ...data, createdAt: serverTimestamp() })
  // Devolvemos 'key' por compatibilidad con el código existente
  return { key: docRef.id, id: docRef.id }
}

export async function uploadPedidoPdf(pedidoKey, blob) {
  const app = getApp()
  const storage = getStorage(app)
  const fileRef = storageRef(storage, `pedidos/${pedidoKey}.pdf`)
  await uploadBytes(fileRef, blob, { contentType: 'application/pdf' })
  const url = await getDownloadURL(fileRef)
  return { url, path: fileRef.fullPath }
}

export async function updatePedidoMeta(pedidoKey, meta) {
  const db = getFs()
  const pedidoRef = doc(db, 'pedidos', pedidoKey)
  await updateDoc(pedidoRef, meta)
}
