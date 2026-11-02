import { apiGet, apiPatch } from './api.js'
import { formatScore } from './memberScore.js'

// HU-18: simulador de puntaje por asistencia. El club sale de la sesión; el front nunca lo manda.
// Cada simulación se pide de nuevo (el back responde no-store): no se cachea nada.

// Si el socio puede simular. Siempre 200:
// { status: 'available' | 'unavailable', reason, message, ranking: { completed_at, calculation_date, rules_version } | null }
export function getSimulatorStatus() {
  return apiGet('/member/scoring/simulator')
}

// Simula un solo evento, siempre por id_interno (el id_externo es único solo dentro del club).
// { event, ranking, rules_notice, distance, current, attend, not_attend, position_estimate }
export function simulateEvent(idInterno) {
  return apiGet(`/member/scoring/simulator/${encodeURIComponent(idInterno)}`)
}

// Configuración del simulador del club (Admin, escenario 14).
// { position_projection_enabled, position_range_level, position_prior_strength, position_min_population }
export function getSimulatorSettings() {
  return apiGet('/admin/simulator/settings')
}

// Manda solo los campos que cambiaron; devuelve la configuración completa.
export function updateSimulatorSettings(changes) {
  return apiPatch('/admin/simulator/settings', changes)
}

// "0.61" -> "+0,61"; "-1.53" -> "−1,53"; "0.00" -> "sin cambios". Sin pasar por float, como formatScore.
export function formatDifference(difference) {
  if (Number(difference) === 0) return 'sin cambios'
  const negative = difference.startsWith('-')
  const abs = negative || difference.startsWith('+') ? difference.slice(1) : difference
  return `${negative ? '−' : '+'}${formatScore(abs)}`
}

// "0.80" -> "80 %"
export function formatLevel(level) {
  return `${Math.round(Number(level) * 100)} %`
}

// "2026-10-29" -> "29/10/2026". Se parte el string: new Date() lo correría un día por la zona horaria.
export function formatCalculationDate(date) {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

const ERRORS = {
  MEMBER_WITHOUT_CLUB: 'Tu cuenta no tiene un club asignado. Consultá con el club.',
  ADMIN_WITHOUT_CLUB: 'Tu cuenta no tiene un club asignado.',
  FORBIDDEN: 'No tenés acceso a esta sección.',
}

const BACKEND_MESSAGES = new Set(['EVENT_NOT_FOUND', 'EVENT_NOT_SIMULABLE', 'NOT_IN_RANKING'])

// Los motivos de EVENT_NOT_FOUND, EVENT_NOT_SIMULABLE y NOT_IN_RANKING vienen del back en español:
// se muestran tal cual.
export function simulatorErrorMessage(err, fallback = 'No pudimos simular el evento. Probá de nuevo en un rato.') {
  if (ERRORS[err.code]) return ERRORS[err.code]
  if (BACKEND_MESSAGES.has(err.code) && err.reason) return err.reason
  if (err.status === 422 && !err.code) return 'Revisá los datos e intentá de nuevo.'
  return fallback
}
