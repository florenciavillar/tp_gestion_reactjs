import { apiGet, apiPost } from './api.js'

// HU-25: cálculo del ranking de socios. El club sale de la cuenta del Admin; el front nunca lo manda.

// Corrida más reciente del club:
// { id, status: 'running' | 'completed' | 'failed', rules_version, calculation_date,
//   calculated_at, completed_at, population_size, error }
// Responde 404 NO_RANKING_RUN si todavía no hubo ninguna (ver isNoRunError).
export function getLatestRun() {
  return apiGet('/admin/ranking/runs/latest')
}

// Calcula el ranking. El pedido queda abierto hasta que el cálculo termina (o falla)
// y devuelve la corrida con su estado final.
export function startRun() {
  return apiPost('/admin/ranking/runs')
}

// "Todavía no se calculó ningún ranking" no es un error: es un estado normal de la pantalla.
export function isNoRunError(err) {
  return err.status === 404 && err.code === 'NO_RANKING_RUN'
}

const ERRORS = {
  FORBIDDEN: 'Solo los admins pueden calcular el ranking.',
  ADMIN_WITHOUT_CLUB: 'Tu cuenta no tiene un club asignado.',
  FORMULA_NOT_PUBLISHED: 'El club todavía no publicó la fórmula del puntaje. Publicala desde la sección Fórmula.',
  RANKING_RUN_IN_PROGRESS: 'Ya hay un cálculo del ranking en curso.',
  GENERIC: 'Algo salió mal. Probá de nuevo.',
}

// El backend manda el motivo en español en `message`; en los errores de auth manda solo el código.
export function rankingErrorMessage(err) {
  if (ERRORS[err.code]) return ERRORS[err.code]
  return err.reason && err.reason !== err.code ? err.reason : ERRORS.GENERIC
}
