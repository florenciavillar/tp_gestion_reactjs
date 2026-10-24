function duration(seconds) {
  if (!seconds) return 'a moment'
  if (seconds < 60) return `${seconds} seconds`
  const minutes = Math.ceil(seconds / 60)
  return minutes === 1 ? '1 minute' : `${minutes} minutes`
}

// Mensajes de los 429 del backend, con el tiempo de espera del header Retry-After.
export function waitMessage(err) {
  switch (err.code) {
    case 'TOO_MANY_ATTEMPTS':
      return `Too many requests. Please try again in ${duration(err.retryAfter)}.`
    case 'RESEND_COOLDOWN':
      return `We already sent you a code. You can request another one in ${duration(err.retryAfter)}.`
    case 'IDENTIFIER_LOCKED':
      return `Too many failed attempts. Please try again in ${duration(err.retryAfter)}.`
    default:
      return undefined
  }
}
