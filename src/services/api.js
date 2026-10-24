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

// `code` es el `detail` que devuelve el backend (por ejemplo MEMBER_NOT_FOUND), para elegir el mensaje.
// `retryAfter`: segundos a esperar cuando el backend responde 429.
export class ApiError extends Error {
  constructor(method, path, status, code, retryAfter) {
    super(`${method} ${path} falló: ${status}`)
    this.status = status
    this.code = typeof code === 'string' ? code : undefined
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
  return data
}

export function apiGet(path) {
  return request('GET', path)
}

export function apiPost(path, body) {
  return request('POST', path, body)
}
