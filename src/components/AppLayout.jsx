import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from './authContext.js'
import UserMenu from './UserMenu.jsx'
import styles from './AppLayout.module.css'

const navLinkClass = ({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`

// Marco de las pantallas con sesión: barra lateral fija con la marca, las opciones y el menú de usuario al pie.
function AppLayout() {
  const { pathname } = useLocation()
  const { user, refreshUser } = useAuth()

  // Si la sesión venció mientras la pantalla estaba abierta, la próxima navegación lo detecta (HU-11).
  useEffect(() => {
    refreshUser()
  }, [pathname, refreshUser])

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link to="/" className={styles.brand}>
          Pasión de 10
        </Link>
        <nav className={styles.nav} aria-label="Principal">
          <NavLink to="/events" className={navLinkClass}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            Eventos
          </NavLink>
          {user?.role === 'member' && (
            <NavLink to="/ranking" end className={navLinkClass}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3M12 13v4M8 20h8" />
              </svg>
              Mi puntaje
            </NavLink>
          )}
          {user?.role === 'member' && (
            <NavLink to="/ranking/breakdown" className={navLinkClass}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
              </svg>
              Desglose
            </NavLink>
          )}
          {user?.role === 'member' && (
            <NavLink to="/ranking/explanation" className={navLinkClass}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5h.01" />
              </svg>
              Cómo se calcula
            </NavLink>
          )}
          {user?.role === 'member' && (
            <NavLink to="/ranking/simulator" className={navLinkClass}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 18l5-6 4 3 7-9M15 6h5v5" />
              </svg>
              Simulador
            </NavLink>
          )}
          {user?.role === 'admin' && (
            <>
              <NavLink to="/admin/formula" className={navLinkClass}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
                  <circle cx="16" cy="6" r="2" />
                  <circle cx="10" cy="12" r="2" />
                  <circle cx="18" cy="18" r="2" />
                </svg>
                Fórmula
              </NavLink>
              <NavLink to="/admin/ranking" className={navLinkClass}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 20h16M7 20v-6M12 20V6M17 20v-10" />
                </svg>
                Ranking
              </NavLink>
              <NavLink to="/admin/segmentation" className={navLinkClass}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 7c3-2 6 2 9 0s6-2 9 0M3 12c3-2 6 2 9 0s6-2 9 0M3 17c3-2 6 2 9 0s6-2 9 0" />
                </svg>
                Oleadas
              </NavLink>
              <NavLink to="/admin/simulator" className={navLinkClass}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 18l5-6 4 3 7-9M15 6h5v5" />
                </svg>
                Simulador
              </NavLink>
              <NavLink to="/admin/equity-analysis" className={navLinkClass}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3v17M6 20h12M4 7l8-3 8 3M6 7l-3 6h6L6 7zm12 0l-3 6h6l-3-6z" />
                </svg>
                Equidad
              </NavLink>
              <NavLink to="/admin/attendance" className={navLinkClass}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 4h6v3H9zM9 5H6v16h12V5h-3M9 13l2 2 4-4" />
                </svg>
                Cargar asistencias
              </NavLink>
            </>
          )}
        </nav>
        <div className={styles.menu}>
          <UserMenu />
        </div>
      </aside>
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  )
}

export default AppLayout
