// Cliente base para el backend. En desarrollo, Vite redirige /api al backend (ver vite.config.js).
const RAW_API_URL = import.meta.env.VITE_API_URL ?? '/api'
const API_URL = RAW_API_URL.replace(/\/+$/, '')
const TOKEN_KEY = 'sessionToken'

// El storage puede no estar disponible (modo privado, cookies bloqueadas): ahí la sesión dura lo que la pestaña.
let memoryToken = null

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? memoryToken
  } catch {
    return memoryToken
  }
}

export function setToken(token) {
  memoryToken = token
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Queda solo en memoria.
  }
}

// `code` sale del `detail` que devuelve el backend, para elegir el mensaje. En auth `detail` es el
// código (por ejemplo MEMBER_NOT_FOUND); en eventos es `{ code, message }`, con el motivo en español.
// `retryAfter`: segundos a esperar cuando el backend responde 429.
export class ApiError extends Error {
  constructor(method, path, status, detail, retryAfter) {
    super(`${method} ${path} falló: ${status}`)
    this.status = status
    const errorObj = detail?.error || detail
    this.code = typeof errorObj === 'string' ? errorObj : errorObj?.code
    this.reason =
      typeof errorObj?.message === 'string' ? errorObj.message : typeof detail === 'string' ? detail : undefined
    this.retryAfter = retryAfter
    // Violaciones por campo (HU-27): [{ code, parameter, message }].
    this.violations = Array.isArray(errorObj?.violations) ? errorObj.violations : undefined
  }
}

// Lo registra el AuthProvider: se llama cuando el backend rechaza la sesión guardada
// (vencida o revocada), para cerrarla también en el navegador.
let onSessionRejected = null

export function setSessionRejectedHandler(handler) {
  onSessionRejected = handler
}

function buildUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${API_URL}${cleanPath}`
}

async function request(method, path, body) {
  const { data } = await send(method, path, body)
  return data
}

async function send(method, path, body) {
  const token = getToken()
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => null)
  if (response.status === 401 && token && path !== '/auth/logout') onSessionRejected?.()
  if (!response.ok) {
    const retryAfter = Number(response.headers.get('Retry-After')) || undefined
    throw new ApiError(method, path, response.status, data?.detail, retryAfter)
  }
  return { data, response }
}

export function apiGet(path) {
  return request('GET', path)
}

// Listas paginadas del backend: la página viene en el cuerpo y el total en el header X-Total-Count.
export async function apiGetPage(path) {
  const { data, response } = await send('GET', path)
  const header = response.headers.get('X-Total-Count')
  return { items: data, total: header === null ? data.length : Number(header) }
}

export function apiPost(path, body) {
  return request('POST', path, body)
}

export function apiPatch(path, body) {
  return request('PATCH', path, body)
}

export async function apiUpload(path, formData) {
  const token = getToken()
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers,
    body: formData,
  })
  const data = await response.json().catch(() => null)
  if (response.status === 401 && token) onSessionRejected?.()
  if (!response.ok) {
    const detail = data?.detail ?? data?.error
    throw new ApiError('POST', path, response.status, detail)
  }
  return data
}

export async function apiDownload(path, defaultFilename = 'archivo.csv') {
  const token = getToken()
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(buildUrl(path), {
    method: 'GET',
    headers,
  })
  if (response.status === 401 && token) onSessionRejected?.()
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const detail = data?.detail ?? data?.error
    throw new ApiError('GET', path, response.status, detail)
  }
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = defaultFilename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

// POST que baja un archivo (HU-29: CSV de la simulación). El nombre sale de Content-Disposition;
// los errores vienen en JSON, igual que en el resto de la API.
export async function apiPostDownload(path, body, defaultFilename = 'archivo.csv') {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  if (response.status === 401 && token) onSessionRejected?.()
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new ApiError('POST', path, response.status, data?.detail ?? data?.error)
  }
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? defaultFilename
  // El blob trae el BOM UTF-8 del back para que Excel lea los acentos: no se toca.
  const url = window.URL.createObjectURL(await response.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
