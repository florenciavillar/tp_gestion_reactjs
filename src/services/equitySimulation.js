import { apiGet, apiPost, getToken, ApiError } from './api.js'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

// HU-30: Servicio de simulación de reglas con análisis de equidad e impacto en perfiles.
// Solo para administradores. Cada simulación se calcula contra el último ranking completado.

// Obtiene el estado inicial del simulador con los parámetros de la fórmula precargados
// y el último ranking completado de referencia.
export function getRulesSimulationForm() {
  return apiGet('/admin/rules-simulation')
}

// Ejecuta la simulación con los valores hipotéticos de los parámetros.
// Devuelve el resultado principal incluyendo `equity` (HU-30).
export function runRulesSimulation(values) {
  return apiPost('/admin/rules-simulation', { values })
}

// Descarga el archivo CSV con las cifras completas de la simulación y equidad.
export async function downloadEquitySimulationCsv(rankingId, values) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_URL}/admin/rules-simulation/export`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ranking_id: rankingId, values }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new ApiError('POST', '/admin/rules-simulation/export', response.status, data?.detail)
  }

  const disposition = response.headers.get('Content-Disposition')
  let filename = 'simulacion-reglas-equidad.csv'
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^"]+)"?/)
    if (match?.[1]) filename = match[1]
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

const ERROR_MESSAGES = {
  NO_BASELINE: 'El club todavía no tiene ningún ranking completado para comparar.',
  EMPTY_RANKING: 'El último ranking del club no tiene socios para simular.',
  BASELINE_NOT_FOUND: 'El ranking de referencia ya no está disponible. Volvé a cargar la página.',
  INVALID_VALUES: 'Revisá los parámetros ingresados: no cumplen las restricciones de la fórmula.',
  ADMIN_WITHOUT_CLUB: 'Tu cuenta de administrador no tiene un club asignado.',
  FORBIDDEN: 'Solo los administradores tienen acceso a la simulación de reglas.',
}

export function equitySimulationErrorMessage(err, fallback = 'No se pudo completar la simulación. Probá de nuevo.') {
  if (err?.violations && err.violations.length > 0) {
    return err.violations.map((v) => v.message).join(' ')
  }
  if (err?.code && ERROR_MESSAGES[err.code]) {
    return ERROR_MESSAGES[err.code]
  }
  if (err?.reason) {
    return err.reason
  }
  return fallback
}
