// Cliente base para el backend. En desarrollo, Vite redirige /api al backend (ver vite.config.js).
const API_URL = import.meta.env.VITE_API_URL ?? '/api'
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
    this.code = typeof detail === 'string' ? detail : detail?.code
    this.reason = typeof detail?.message === 'string' ? detail.message : undefined
    this.retryAfter = retryAfter
  }
}

// Lo registra el AuthProvider: se llama cuando el backend rechaza la sesión guardada
// (vencida o revocada), para cerrarla también en el navegador.
let onSessionRejected = null

export function setSessionRejectedHandler(handler) {
  onSessionRejected = handler
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

  const response = await fetch(`${API_URL}${path}`, {
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
