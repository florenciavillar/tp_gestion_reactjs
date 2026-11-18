import { apiGet } from './api.js'

// Contacto del club del socio para el manual: { club: 'Boca Juniors', admin: { name, email } | null }.
// El club sale de la cuenta; el front nunca lo manda.
export function getClubContact() {
  return apiGet('/member/club/contact')
}
