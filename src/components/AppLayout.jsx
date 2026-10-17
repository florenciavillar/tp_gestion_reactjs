import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { useAuth } from './authContext.js'
import UserMenu from './UserMenu.jsx'
import styles from './AppLayout.module.css'

// Marco de las pantallas con sesión: el menú de usuario queda arriba a la derecha.
function AppLayout() {
  const { pathname } = useLocation()
  const { refreshUser } = useAuth()

  // Si la sesión venció mientras la pantalla estaba abierta, la próxima navegación lo detecta (HU-11).
  useEffect(() => {
    refreshUser()
  }, [pathname, refreshUser])

  return (
    <>
      <header className={styles.header}>
        <UserMenu />
      </header>
      <Outlet />
    </>
  )
}

export default AppLayout
