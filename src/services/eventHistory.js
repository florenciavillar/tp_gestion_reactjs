import { apiGet } from './api.js'

// HU-15: historial de eventos del socio y reglas vigentes en cada uno. El club sale de la cuenta;
// el front nunca lo manda.

// { status: 'ok' | 'empty', message, total, events }. Cada evento:
// { id_interno, titulo, fecha_hora, tipo, rules_version: { number, published_at, url } | null, rules_message }
export function getEventHistory() {
  return apiGet('/member/events/history')
}

// { rules_version, published_at, in_force, formula, explanation }; `explanation` es la misma de HU-13.
export function getRulesVersion(number) {
  return apiGet(`/member/scoring/rules/${encodeURIComponent(number)}`)
}

export function rulesLinkLabel(number) {
  return `Ver reglas (versión ${number})`
}

// El back manda la URL de su API (`url`); la pantalla del front que la muestra es esta.
export function rulesPagePath(number) {
  return `/ranking/rules/${encodeURIComponent(number)}`
}

const NO_CLUB = 'Tu cuenta no tiene un club asignado. Consultá con el club.'

export function historyErrorMessage(err) {
  if (err.code === 'MEMBER_WITHOUT_CLUB') return NO_CLUB
  return 'No pudimos cargar tu historial. Probá de nuevo en un rato.'
}

export function rulesErrorMessage(err) {
  if (err.code === 'MEMBER_WITHOUT_CLUB') return NO_CLUB
  if (err.code === 'RULES_VERSION_NOT_FOUND') return 'No encontramos esa versión de reglas.'
  return 'No pudimos cargar las reglas. Probá de nuevo en un rato.'
}
