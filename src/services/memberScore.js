import { apiGet } from './api.js'

// HU-14: puntaje y posición del socio en el último ranking completado de su club.
// El club sale de la cuenta; el front nunca lo manda. Siempre responde 200: sin datos devuelve la vista provisional.
// { status: 'ranked' | 'provisional', reason: null | 'FEES_OVERDUE' | 'NO_RANKING' | 'NOT_IN_RANKING',
//   score: '59.55', position: 342 | null, ranked_total: 5000,
//   ranking: { completed_at, rules_version } | null, label, message }
export function getCurrentScore() {
  return apiGet('/member/scoring/current')
}

// "59.55" -> "59,55". El backend ya manda dos decimales: se cambia solo el separador, sin pasar por float.
export function formatScore(score) {
  return score.replace('.', ',')
}

const integerFormat = new Intl.NumberFormat('es-AR')

// "Puesto 342 de 5.000 socios"
export function formatPosition(position, rankedTotal) {
  const socios = rankedTotal === 1 ? 'socio' : 'socios'
  return `Puesto ${integerFormat.format(position)} de ${integerFormat.format(rankedTotal)} ${socios}`
}
