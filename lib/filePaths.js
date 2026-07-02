export function createUploadPath(file) {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const ext = file.name.split('.').pop() || 'jpg'
  const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`
  return `photo/uploads/${year}/${month}/${id}.${ext}`
}

export function formatDate(value) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric'
  }).format(new Date(value))
}

export function statusLabel(status) {
  if (status === 'complete') return 'Reviewed'
  if (status === 'rejected') return 'Reviewed'
  return 'Pending'
}
