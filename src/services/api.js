// Cliente base para el backend. En desarrollo, Vite redirige /api al backend (ver vite.config.js).
const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export async function apiGet(path) {
  const response = await fetch(`${API_URL}${path}`)
  if (!response.ok) throw new Error(`GET ${path} falló: ${response.status}`)
  return response.json()
}
