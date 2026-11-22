import { apiGet } from './api.js'

// HU-42: Reporte Ejecutivo de Scoring y Equidad (WISH / Comisión Directiva).
// Solo administradores. Los datos salen del ranking vigente completado del club.

export function getExecutiveReport() {
  return apiGet('/admin/reports/executive-scoring')
}

export function isNoBaselineError(err) {
  return err.status === 404 && err.code === 'NO_BASELINE'
}

export function isEmptyRankingError(err) {
  return err.status === 422 && err.code === 'EMPTY_RANKING'
}

const ERRORS = {
  NO_BASELINE: 'Todavía no hay un ranking calculado. Calculá el ranking para generar el reporte ejecutivo.',
  EMPTY_RANKING: 'El ranking vigente no tiene socios: no hay datos para generar el reporte.',
  FORBIDDEN: 'Solo los administradores pueden consultar el reporte ejecutivo.',
  ADMIN_WITHOUT_CLUB: 'Tu cuenta no tiene un club asignado.',
}

export function executiveReportErrorMessage(err) {
  if (ERRORS[err.code]) return ERRORS[err.code]
  if (err.reason && err.reason !== err.code) return err.reason
  return 'No se pudo cargar el reporte ejecutivo.'
}
