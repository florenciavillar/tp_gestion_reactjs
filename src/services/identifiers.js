// Mismas reglas que el backend: DNI y número de socio son numéricos (se aceptan puntos y
// espacios, como en "30.111.222"); el email solo se acepta en el login de socios.
export function isNumberIdentifier(value) {
  return /^\d{1,16}$/.test(value.replace(/[.\s]/g, ''))
}

export function isEmail(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)
}
