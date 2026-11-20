import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { formatUnreadCount, getUnreadCount } from '../services/notifications.js'
import { useAuth } from './authContext.js'
import { UnreadCountContext } from './unreadCountContext.js'
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

  // Contador de notificaciones sin leer (HU-20): se pide en cada cambio de pantalla, sin polling.
  const isMember = user?.role === 'member'
  const unread = useUnreadCounter(isMember)
  const { refresh: refreshUnread } = unread
  useEffect(() => {
    if (isMember) refreshUnread()
  }, [pathname, isMember, refreshUnread])

  return (
    <UnreadCountContext.Provider value={unread}>
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
            {isMember && <NotificationsLink count={unread.count} />}
            {user?.role === 'member' && (
              <NavLink to="/ranking" end className={navLinkClass}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3M12 13v4M8 20h8" />
                </svg>
                Mi puntaje
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
              <NavLink to="/ranking/history" className={navLinkClass}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2" />
                </svg>
                Mi historial
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
                <RankingGroup pathname={pathname} />
                <NavLink to="/admin/segmentation" className={navLinkClass}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 7c3-2 6 2 9 0s6-2 9 0M3 12c3-2 6 2 9 0s6-2 9 0M3 17c3-2 6 2 9 0s6-2 9 0" />
                  </svg>
                  Oleadas
                </NavLink>
                <SimulationGroup pathname={pathname} />
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
    </UnreadCountContext.Provider>
  )
}

// Estado del contador. Cada pedido lleva un número: solo cuenta la respuesta del último, y un cambio
// local (marcar como leída desde la bandeja) descarta las respuestas que estaban en camino.
function useUnreadCounter(enabled) {
  const [count, setCountState] = useState(null)
  const sequence = useRef(0)

  const refresh = useCallback(() => {
    const current = ++sequence.current
    getUnreadCount()
      .then((data) => {
        if (sequence.current === current) setCountState(data.unread_count)
      })
      .catch(() => {
        // Si falla, el menú queda sin número y sin error.
        if (sequence.current === current) setCountState(null)
      })
  }, [])

  const setCount = useCallback((value) => {
    sequence.current += 1
    setCountState(value)
  }, [])

  return useMemo(() => ({ count: enabled ? count : null, setCount, refresh }), [enabled, count, setCount, refresh])
}

// Entrada "Notificaciones" del socio con el número de no leídas. El número no es solo visual:
// los lectores de pantalla leen "N sin leer".
function NotificationsLink({ count }) {
  const label = formatUnreadCount(count)
  return (
    <NavLink to="/notifications" className={navLinkClass}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2ZM10 20a2 2 0 0 0 4 0" />
      </svg>
      Notificaciones
      {label && (
        <>
          <span className={styles.badge} aria-hidden="true">
            {label}
          </span>
          <span className={styles.srOnly}>, {label} sin leer</span>
        </>
      )}
    </NavLink>
  )
}

// Grupo del menú con subopciones: aparecen al pasar el mouse. Con teclado se abren al enfocar el grupo,
// y en pantallas táctiles con un toque. Si se está en una de ellas, quedan abiertas.
function NavGroup({ label, icon, active, children }) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const expanded = open || active

  return (
    <div className={`${styles.navGroup} ${expanded ? styles.navGroupOpen : ''}`} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className={`${styles.navLink} ${styles.navGroupButton} ${active ? styles.navLinkActive : ''}`}
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        {icon}
        {label}
        <svg className={styles.navGroupChevron} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div id={listId} className={styles.subnav}>
        <div className={styles.subnavInner}>{children}</div>
      </div>
    </div>
  )
}

// Grupo "Ranking" del Admin: el cálculo (HU-25, con los rankings por pilar de HU-44) y el reporte
// ejecutivo (HU-42).
function RankingGroup({ pathname }) {
  return (
    <NavGroup
      label="Ranking"
      active={pathname.startsWith('/admin/ranking')}
      icon={
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20h16M7 20v-6M12 20V6M17 20v-10" />
        </svg>
      }
    >
      <NavLink to="/admin/ranking" end className={subNavLinkClass}>
        Calcular ranking
      </NavLink>
      <NavLink to="/admin/ranking/executive-report" className={subNavLinkClass}>
        Reporte ejecutivo
      </NavLink>
    </NavGroup>
  )
}

// Grupo "Simulación" del Admin.
function SimulationGroup({ pathname }) {
  return (
    <NavGroup
      label="Simulación"
      active={pathname.startsWith('/admin/simulator') || pathname.startsWith('/admin/rules-simulation')}
      icon={
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 18l5-6 4 3 7-9M15 6h5v5" />
        </svg>
      }
    >
      <NavLink to="/admin/rules-simulation" className={subNavLinkClass}>
        Simular Reglas
      </NavLink>
      {/* Configuración del simulador de los socios (HU-18). */}
      <NavLink to="/admin/simulator" className={subNavLinkClass}>
        Configuración Socios
      </NavLink>
    </NavGroup>
  )
}

const subNavLinkClass = ({ isActive }) => `${styles.subNavLink} ${isActive ? styles.subNavLinkActive : ''}`

export default AppLayout
