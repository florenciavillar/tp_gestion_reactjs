import { apiGet, apiPost } from './api.js'

// HU-36: segmentación de socios en olas de un partido. El club sale de la cuenta del Admin.

// Partidos publicados que todavía no empezaron:
// [{ event: { id_interno, titulo, fecha_hora, lugar }, segmentation: { generated_at, waves_count } | null,
//    schedule: { status: 'draft' | 'confirmed' | 'invalidated', opening_at, closing_at } | null }]
// `schedule` es el cronograma de las olas (HU-37).
export function getSegmentableEvents() {
  return apiGet('/admin/segmentation/events')
}

// Advertencias antes de generar: { warnings: [{ code, message, data_as_of }], can_continue }.
// `code`: ROSTER_STALE o LOADS_AFTER_LAST_RANKING. No bloquean.
export function getSegmentationPreflight() {
  return apiGet('/admin/segmentation/preflight')
}

// Olas de un partido: { event, ranking: { id, completed_at, rules_version }, ranked_total,
// percentile_step, generated_at, generated_by, waves: [{ order, percentile_from, percentile_to,
// position_from, position_to, socios }] }. 404 SEGMENTATION_NOT_FOUND si todavía no tiene.
export function getSegmentation(idInterno) {
  return apiGet(`/admin/events/${encodeURIComponent(idInterno)}/segmentation`)
}

// Genera las olas. Si el partido ya tiene, el backend exige `confirmed: true` (si no, 422 CONFIRMATION_REQUIRED).
export function generateSegmentation(idInterno, confirmed) {
  return apiPost(`/admin/events/${encodeURIComponent(idInterno)}/segmentation`, { confirmed })
}

export function isNoSegmentationError(err) {
  return err.status === 404 && err.code === 'SEGMENTATION_NOT_FOUND'
}

const ERRORS = {
  FORBIDDEN: 'Solo los admins pueden generar las olas.',
  ADMIN_WITHOUT_CLUB: 'Tu cuenta no tiene un club asignado.',
  GENERIC: 'Algo salió mal. Probá de nuevo.',
}

// El backend manda el motivo en español en `message` (por ejemplo, qué requisito falta).
export function segmentationErrorMessage(err) {
  if (ERRORS[err.code]) return ERRORS[err.code]
  return err.reason && err.reason !== err.code ? err.reason : ERRORS.GENERIC
}
