async function http(method, url, data){
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (data !== undefined) opts.body = JSON.stringify(data)
  const res = await fetch(url, opts)
  if (!res.ok) throw new Error(await res.text())
  return res.status === 204 ? null : res.json()
}
export const api = {
  get: (u)=> http('GET', u),
  post: (u,d)=> http('POST', u, d),
  put: (u,d)=> http('PUT', u, d),
  patch: (u,d)=> http('PATCH', u, d),
  del: (u)=> http('DELETE', u),
}
