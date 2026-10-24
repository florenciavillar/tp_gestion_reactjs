import { apiGet, apiPost } from './api.js'

// Todos los pedidos de código devuelven { challenge, email_hint }; el challenge vuelve con el código.
function verify(path, challenge, code) {
  return apiPost(path, { challenge, code })
}

// Socios: activación de la cuenta (HU-01) con DNI o número de socio.
export function requestMemberActivation(identifier, identifierType) {
  return apiPost('/auth/member/activation/request', { identifier, identifier_type: identifierType })
}

export function verifyMemberActivation(challenge, code) {
  return verify('/auth/member/activation/verify', challenge, code)
}

// Socios: login (HU-05) con DNI, número de socio o email. Devuelve { token, user }.
export function requestMemberLogin(identifier, identifierType) {
  return apiPost('/auth/member/login/request', { identifier, identifier_type: identifierType })
}

export function verifyMemberLogin(challenge, code) {
  return verify('/auth/member/login/verify', challenge, code)
}

// Admins: login (HU-06) solo con email. Devuelve { token, user }.
export function requestAdminLogin(email) {
  return apiPost('/auth/admin/login/request', { email })
}

export function verifyAdminLogin(challenge, code) {
  return verify('/auth/admin/login/verify', challenge, code)
}

export function getMe() {
  return apiGet('/auth/me')
}

export function logout() {
  return apiPost('/auth/logout')
}

// Solo admins (HU-07): la cuenta queda pendiente hasta que el invitado abre el link del mail.
export function createAdmin({ name, email, emailConfirmation }) {
  return apiPost('/admin/accounts', { name, email, email_confirmation: emailConfirmation })
}

// HU-08: abrir el link activa la cuenta. Devuelve { email_hint }.
export function acceptAdminInvitation(token) {
  return apiPost('/admin/invitations/accept', { token })
}
