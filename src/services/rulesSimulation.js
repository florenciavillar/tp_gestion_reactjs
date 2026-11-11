import { apiGet, apiPost, apiPostDownload } from './api.js'

// HU-29: simulación del impacto de un cambio de reglas. Nada se guarda en el back.
// El club sale de la cuenta del Admin; el front nunca lo manda.

export function getRulesSimulation() {
  return apiGet('/admin/rules-simulation')
}

export function simulateRules(values) {
  return apiPost('/admin/rules-simulation', { values })
}

// Con los mismos `values` y el `ranking.id` del resultado que está en pantalla.
export function getBreakdown(rankingId, values) {
  return apiPost('/admin/rules-simulation/breakdown', { ranking_id: rankingId, values })
}

export function exportRulesSimulation(rankingId, values) {
  return apiPostDownload('/admin/rules-simulation/export', { ranking_id: rankingId, values }, 'simulacion-reglas.csv')
}

// Un 5xx, un error de red o un timeout del desglose se muestran igual que su `unavailable` (escenario 21).
export const BREAKDOWN_UNAVAILABLE =
  'No pudimos calcular el efecto de cada parámetro. El resultado general sigue siendo válido.'

export const EMPTY_RANKING = 'El último ranking no tiene socios: no hay nada para simular.'

const ERRORS = {
  FORBIDDEN: 'Solo los admins pueden simular cambios de reglas.',
  ADMIN_WITHOUT_CLUB: 'Tu cuenta no tiene un club asignado.',
  GENERIC: 'Algo salió mal. Probá de nuevo.',
}

// El back manda el texto del spec en `message`; los errores de auth traen solo el código.
export function rulesSimulationErrorMessage(err) {
  if (ERRORS[err.code]) return ERRORS[err.code]
  return err.reason && err.reason !== err.code ? err.reason : ERRORS.GENERIC
}

// Los números llegan como string con punto y ya redondeados: solo se cambia el separador,
// sin pasar por float para no perder ceros ("0.00").
export function formatDecimal(value) {
  return value == null ? '—' : String(value).replace('.', ',')
}

// Diferencias con signo: el back no manda el "+" de los positivos ni "-0.00".
export function formatSigned(value) {
  if (value == null) return '—'
  const text = formatDecimal(value)
  return /^[1-9]|^0,0*[1-9]/.test(text) ? `+${text}` : text
}

const integerFormat = new Intl.NumberFormat('es-AR')

export function formatInteger(value) {
  return integerFormat.format(value)
}

// HU-30: grupos de todos los atributos disponibles con desvío distinto de cero, del que más sube al que más baja.
export function equityGroups(segmentations) {
  return segmentations
    .filter((seg) => seg.status === 'available')
    .flatMap((seg) =>
      seg.segments.map((segment) => ({
        id: `${seg.attribute}-${segment.band.label}`,
        attribute: seg.attribute,
        attributeLabel: seg.label,
        band: segment.band.label,
        lower: segment.band.lower,
        upper: segment.band.upper,
        value: Number(segment.deviation),
        deviation: segment.deviation,
        positionChange: segment.avg_position_change,
        count: segment.count,
        mark: segment.mark,
      })),
    )
    .filter((group) => group.value !== 0)
    .sort((a, b) => b.value - a.value)
}
