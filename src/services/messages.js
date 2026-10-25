function duration(seconds) {
  if (!seconds) return 'un momento'
  if (seconds === 1) return '1 segundo'
  if (seconds < 60) return `${seconds} segundos`
  const minutes = Math.ceil(seconds / 60)
  return minutes === 1 ? '1 minuto' : `${minutes} minutos`
}

// Mensajes de los 429 del backend, con el tiempo de espera del header Retry-After.
export function waitMessage(err) {
  switch (err.code) {
    case 'TOO_MANY_ATTEMPTS':
      return `Demasiados pedidos. Probá de nuevo en ${duration(err.retryAfter)}.`
    case 'RESEND_COOLDOWN':
      return `Ya te mandamos un código. Podés pedir otro en ${duration(err.retryAfter)}.`
    case 'IDENTIFIER_LOCKED':
      return `Demasiados intentos fallidos. Probá de nuevo en ${duration(err.retryAfter)}.`
    default:
      return undefined
  }
}
