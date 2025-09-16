document.addEventListener('DOMContentLoaded', async () => {
  // simple ping to backend health
  try { await apiGet('/api/health') } catch {}
})

