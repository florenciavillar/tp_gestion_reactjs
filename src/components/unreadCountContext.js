import { createContext, useContext } from 'react'

// Contador de notificaciones sin leer del socio (HU-20), compartido entre la barra lateral y la bandeja.
// { count, setCount, refresh } del AppLayout. `count` es null mientras no se conoce o si falló la carga.
export const UnreadCountContext = createContext({ count: null, setCount: () => {}, refresh: () => {} })

export function useUnreadCount() {
  return useContext(UnreadCountContext)
}
