import { useCallback, useEffect, useState } from 'react'
import { getToken, setSessionRejectedHandler, setToken } from '../services/api.js'
import { getMe, logout } from '../services/auth.js'
import { AuthContext } from './authContext.js'

// Usuario logueado (socio o administrador). Al cargar la app, si hay un token guardado se recupera la sesión.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(getToken()))
  // true cuando el backend dio por terminada la sesión (inactividad, límite de 12 horas o revocada).
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    setSessionRejectedHandler(() => {
      setToken(null)
      setUser(null)
      setSessionExpired(true)
    })
    return () => setSessionRejectedHandler(null)
  }, [])

  useEffect(() => {
    if (!getToken()) return
    let ignore = false
    getMe()
      .then((me) => { if (!ignore) setUser(me) })
      .catch(() => {})
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [])

  // Cada navegación dentro de la app cuenta como actividad y verifica que la sesión siga vigente.
  const refreshUser = useCallback(() => {
    getMe().then(setUser).catch(() => {})
  }, [])

  // Recibe lo que devuelve la verificación del código de login: { token, user }.
  function startSession({ token, user: loggedIn }) {
    setToken(token)
    setUser(loggedIn)
    setSessionExpired(false)
  }

  // Aunque falle el pedido al back, la sesión se cierra igual en el navegador.
  async function signOut() {
    try {
      await logout()
    } catch {
      // La sesión vence sola en el back.
    }
    setToken(null)
    setUser(null)
    setSessionExpired(false)
  }

  return (
    <AuthContext.Provider value={{ user, loading, sessionExpired, startSession, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
