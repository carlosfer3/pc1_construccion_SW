async function api(method, url, data){
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (data !== undefined) opts.body = JSON.stringify(data)
  const res = await fetch(url, opts)
  if (!res.ok) throw new Error(await res.text())
  return res.status === 204 ? null : res.json()
}
const apiGet = (u)=> api('GET', u)
const apiPost = (u,d)=> api('POST', u, d)
const apiPut = (u,d)=> api('PUT', u, d)
const apiDelete = (u)=> api('DELETE', u)

