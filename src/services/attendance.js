import { apiDownload, apiGet, apiPost, apiUpload } from './api.js'

// HU-24: Listar eventos ya ocurridos elegibles para carga de asistencia
export function getEligibleEvents() {
  return apiGet('/admin/events/eligible-for-attendance')
}

// HU-24: Subir archivo CSV de asistencia para un evento puntual
export function uploadAttendanceCSV(eventoIdExterno, file, confirmReplace = false) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('confirm_replace', confirmReplace ? 'true' : 'false')
  return apiUpload(`/admin/events/${encodeURIComponent(eventoIdExterno)}/attendance/upload-csv`, formData)
}

// HU-24: Subir archivo CSV de actividades recurrentes (deporte federado y subcomisiones)
export function uploadActivitiesCSV(file) {
  const formData = new FormData()
  formData.append('file', file)
  return apiUpload('/admin/activities/upload-csv', formData)
}

// HU-24: Listar cargas de asistencia pendientes de aprobación por el Admin (reemplazos enviados por el club)
export function getPendingApprovals() {
  return apiGet('/admin/attendance/pending-approvals')
}

// HU-24: Aprobar reemplazo de asistencia pendiente
export function approveReplacement(cargaId) {
  return apiPost(`/admin/attendance/${encodeURIComponent(cargaId)}/approve`)
}

// HU-24: Rechazar reemplazo de asistencia pendiente
export function rejectReplacement(cargaId, motivo) {
  const query = motivo ? `?motivo=${encodeURIComponent(motivo)}` : ''
  return apiPost(`/admin/attendance/${encodeURIComponent(cargaId)}/reject${query}`)
}

// HU-24 / FR-008: Descargar archivo CSV con los registros rechazados y sus motivos
export function downloadRejectionsCSV(cargaId) {
  return apiDownload(
    `/admin/attendance/cargas/${encodeURIComponent(cargaId)}/rejections/csv`,
    `rechazos-${cargaId}.csv`,
  )
}
