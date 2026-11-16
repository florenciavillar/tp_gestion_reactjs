// Las fechas de los eventos se muestran en hora de Buenos Aires, sea cual sea la zona del dispositivo.
const TIME_ZONE = 'America/Argentina/Buenos_Aires'

const dateFormat = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const timeFormat = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// "Sábado 21 de noviembre"
export function formatEventDate(iso) {
  const text = dateFormat.format(new Date(iso))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// "17:00"
export function formatEventTime(iso) {
  return timeFormat.format(new Date(iso))
}

const factorFormat = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// Factor de una clase de partido: "1,3"
export function formatFactor(factor) {
  return factorFormat.format(factor)
}

// El back usa 'Institucional' en la lista del Admin y el nombre completo en la del socio.
const TYPE_LABELS = {
  Partido: 'Partido',
  Institucional: 'Evento institucional/amateur',
}

export function eventTypeLabel(tipo) {
  return TYPE_LABELS[tipo] ?? tipo
}

export function isMatch(tipo) {
  return tipo === 'Partido'
}

// Tiempo restante legible: "2 d 4 h", "5 h 12 min", "12 min".
export function formatRemaining(seconds) {
  if (seconds < 60) return 'menos de 1 min'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return hours > 0 ? `${days} d ${hours} h` : `${days} d`
  if (hours > 0) return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`
  return `${minutes} min`
}

const dateTimeFormat = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// "26/10/2026 14:30"
export function formatDateTime(iso) {
  return dateTimeFormat.format(new Date(iso)).replace(',', '')
}

function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

// Cuenta regresiva del turno (HU-39): "Faltan 2 días, 3 h y 15 min", "Falta 1 h", "Falta menos de un minuto".
export function formatCountdown(seconds) {
  if (seconds < 60) return 'Falta menos de un minuto'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const parts = [
    days > 0 && plural(days, 'día', 'días'),
    hours > 0 && `${hours} h`,
    minutes > 0 && `${minutes} min`,
  ].filter(Boolean)
  const text = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}` : parts[0]
  const first = days || hours || minutes
  return `${first === 1 ? 'Falta' : 'Faltan'} ${text}`
}

// "sábado 21 de noviembre", para usar en medio de una frase.
export function formatEventDateInline(iso) {
  return dateFormat.format(new Date(iso))
}
