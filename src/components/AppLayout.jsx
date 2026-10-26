import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from './authContext.js'
import UserMenu from './UserMenu.jsx'
import styles from './AppLayout.module.css'

// Marco de las pantallas con sesión: la barra superior lleva la marca y las opciones a la izquierda y el menú de usuario a la derecha.
function AppLayout() {
  const { pathname } = useLocation()
  const { user, refreshUser } = useAuth()

  // Si la sesión venció mientras la pantalla estaba abierta, la próxima navegación lo detecta (HU-11).
  useEffect(() => {
    refreshUser()
  }, [pathname, refreshUser])

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>Pasión de 10</Link>
        <nav className={styles.nav} aria-label="Principal">
          <NavLink
            to="/events"
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
          >
            Eventos
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink
              to="/admin/formula"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
            >
              Fórmula
            </NavLink>
          )}
        </nav>
        <UserMenu />
      </header>
      <Outlet />
    </div>
  )
}

export default AppLayout