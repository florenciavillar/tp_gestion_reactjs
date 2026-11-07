import { apiGet, apiPost } from './api.js'

// HU-27: fórmula base del club. El club sale de la cuenta del Admin; el front nunca lo manda.

// Catálogo, reglas vigentes (con su explicación) y estado del bloqueo.
export function getFormulas() {
  return apiGet('/admin/formulas')
}

// Estructura de una fórmula con los valores ya cargados y `rules_version_in_force`,
// que hay que devolver al publicar.
export function getFormula(id, version) {
  return apiGet(`/admin/formulas/${encodeURIComponent(id)}/${version}`)
}

// Valida y explica sin guardar: { valid, violations, explanation }.
export function previewFormula(id, version, values) {
  return apiPost(`/admin/formulas/${encodeURIComponent(id)}/${version}/preview`, { values })
}

export function publishFormula(id, version, { values, expectedRulesVersion }) {
  return apiPost(`/admin/formulas/${encodeURIComponent(id)}/${version}/publish`, {
    values,
    expected_rules_version: expectedRulesVersion,
    confirmed: true,
  })
}

// HU-28: ajusta los parámetros de la fórmula en vigor del club.
export function adjustFormula({ values, expectedRulesVersion }) {
  return apiPost('/admin/formulas/adjust', {
    values,
    expected_rules_version: expectedRulesVersion,
    confirmed: true,
  })
}

export function lockFormula(reason) {
  return apiPost('/admin/formulas/lock', { reason })
}

export function unlockFormula(reason) {
  return apiPost('/admin/formulas/unlock', { reason })
}

// HU-13: explicación de las reglas vigentes del club del socio. El club sale de la cuenta.
// { status: 'published' | 'none', message, rules_version, formula, explanation, notice }
export function getRankingExplanation() {
  return apiGet('/member/scoring/explanation')
}

// HU-16: desglose de los componentes del puntaje del socio
// { has_ranking, message, rules_version, calculation_date, total, position, components }
export function getScoreBreakdown() {
  return apiGet('/member/scoring/breakdown')
}

const ERRORS = {
  FORBIDDEN: 'Solo los admins pueden gestionar la fórmula.',
  ADMIN_WITHOUT_CLUB: 'Tu cuenta no tiene un club asignado.',
  MEMBER_WITHOUT_CLUB: 'Tu cuenta no tiene un club asignado. Consultá con el club.',
  REASON_REQUIRED: 'Indicá el motivo.',
  GENERIC: 'Algo salió mal. Probá de nuevo.',
}

// El backend manda el motivo en español en `message`; en los errores de auth manda solo el código.
export function formulaErrorMessage(err) {
  if (ERRORS[err.code]) return ERRORS[err.code]
  if (err.status === 422 && !err.code) return 'Revisá los datos e intentá de nuevo.'
  return err.reason && err.reason !== err.code ? err.reason : ERRORS.GENERIC
}

const numberFormat = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 6 })

// "0.6" -> "0,6"; "1200" -> "1200" (sin separador de miles, como en los textos del backend).
export function formatNumber(value) {
  return numberFormat.format(Number(value)).replace(/\./g, '')
}

export function withUnit(value, unit) {
  return unit ? `${formatNumber(value)} ${unit}` : formatNumber(value)
}
