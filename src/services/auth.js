// Valida que el ID o número de socio exista y no tenga cuenta creada.
// TODO: reemplazar por la llamada al backend cuando exista el endpoint; por ahora siempre es válido.
export async function activateMembership(membershipNumber) {
  return { valid: true, membershipNumber }
}
