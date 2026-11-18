import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useUnreadCount } from '../components/unreadCountContext.js'
import { formatDateTime } from '../services/eventFormat.js'
import { getNotifications, markAllRead, markRead, notificationTarget } from '../services/notifications.js'
import eventStyles from '../components/Events.module.css'
import pageStyles from './Page.module.css'
import styles from './Notifications.module.css'

const PAGE_SIZE = 20
const LOAD_ERROR = 'No pudimos cargar tus notificaciones. Intentá de nuevo.'
const MORE_ERROR = 'No pudimos cargar más notificaciones. Intentá de nuevo.'
const MARK_ALL_ERROR = 'No pudimos marcar las notificaciones como leídas. Intentá de nuevo.'

// Agrega una página sin repetir ids: si entre dos páginas llegó una nueva, la siguiente repite el último ítem.
function appendPage(items, page) {
  const seen = new Set(items.map((item) => item.id))
  return [...items, ...page.filter((item) => !seen.has(item.id))]
}

// HU-20: bandeja de notificaciones del socio, la más reciente primero. Abrir una la marca como leída y
// lleva a su destino (notificaciones §3). Solo lectura: no hay borrar, archivar ni filtros.
function Notifications() {
  const navigate = useNavigate()
  const { setCount, refresh } = useUnreadCount()
  // Se recarga desde cero al montar: al volver desde un destino, la lista refleja lo leído.
  const [state, setState] = useState({ status: 'loading' })
  const [version, setVersion] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [markAllError, setMarkAllError] = useState(false)

  useEffect(() => {
    let ignore = false
    getNotifications({ limit: PAGE_SIZE, offset: 0 })
      .then((data) => {
        if (ignore) return
        setState({ status: 'ready', items: data.items, total: data.total, unreadCount: data.unread_count })
        setCount(data.unread_count)
      })
      .catch(() => {
        if (!ignore) setState({ status: 'error' })
      })
    return () => {
      ignore = true
    }
  }, [version, setCount])

  function retry() {
    setState({ status: 'loading' })
    setVersion((v) => v + 1)
  }

  function loadMore() {
    setLoadingMore(true)
    setMoreError(false)
    getNotifications({ limit: PAGE_SIZE, offset: state.items.length })
      .then((data) => {
        setState((current) => ({
          ...current,
          items: appendPage(current.items, data.items),
          total: data.total,
          unreadCount: data.unread_count,
        }))
        setCount(data.unread_count)
      })
      .catch(() => setMoreError(true))
      .finally(() => setLoadingMore(false))
  }

  function open(notification) {
    if (notification.state === 'unread') {
      // Sin esperar la respuesta: si falla, la próxima carga muestra el estado real. Al volver,
      // se pide el contador de nuevo para que refleje lo que guardó el backend.
      markRead(notification.id)
        .then(refresh)
        .catch(() => {})
      setState((current) => ({
        ...current,
        items: current.items.map((item) => (item.id === notification.id ? { ...item, state: 'read' } : item)),
        unreadCount: Math.max(0, current.unreadCount - 1),
      }))
      setCount((count) => (count == null ? count : Math.max(0, count - 1)))
    }
    const target = notificationTarget(notification)
    if (target) navigate(target, { state: { fromNotification: true } })
  }

  function markAll() {
    setMarkingAll(true)
    setMarkAllError(false)
    markAllRead()
      .then((data) => {
        setState((current) => ({
          ...current,
          items: current.items.map((item) => (item.state === 'unread' ? { ...item, state: 'read' } : item)),
          unreadCount: data.unread_count ?? 0,
        }))
        setCount(data.unread_count ?? 0)
      })
      .catch(() => setMarkAllError(true))
      .finally(() => setMarkingAll(false))
  }

  return (
    <main className={`${pageStyles.page} ${pageStyles.reading}`}>
      <header className={pageStyles.header}>
        <Link to="/" className={pageStyles.back} aria-label="Volver al inicio">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>Notificaciones</h1>
        <p className={pageStyles.lead}>Los avisos del club sobre eventos, turnos de reserva y el ranking.</p>
      </header>

      {state.status === 'loading' && (
        <p className={eventStyles.muted} role="status">
          Cargando notificaciones…
        </p>
      )}

      {state.status === 'error' && (
        <div className={styles.errorBox}>
          <p className={eventStyles.error} role="alert">
            {LOAD_ERROR}
          </p>
          <button type="button" className={eventStyles.secondary} onClick={retry}>
            Reintentar
          </button>
        </div>
      )}

      {state.status === 'ready' && state.items.length === 0 && (
        <p className={eventStyles.empty}>No tenés notificaciones.</p>
      )}

      {state.status === 'ready' && state.items.length > 0 && (
        <>
          {state.unreadCount > 0 && (
            <div className={styles.toolbar}>
              <p className={styles.summary}>
                {state.unreadCount === 1 ? 'Tenés 1 sin leer.' : `Tenés ${state.unreadCount} sin leer.`}
              </p>
              <button type="button" className={eventStyles.secondary} onClick={markAll} disabled={markingAll}>
                Marcar todas como leídas
              </button>
            </div>
          )}
          {markAllError && (
            <p className={eventStyles.error} role="alert">
              {MARK_ALL_ERROR}
            </p>
          )}

          <ul className={styles.list}>
            {state.items.map((notification) => (
              <li key={notification.id}>
                <NotificationItem notification={notification} onOpen={open} />
              </li>
            ))}
          </ul>

          {moreError && (
            <p className={eventStyles.error} role="alert">
              {MORE_ERROR}
            </p>
          )}
          {state.items.length < state.total && (
            <button
              type="button"
              className={`${eventStyles.secondary} ${styles.more}`}
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Cargando…' : 'Cargar más'}
            </button>
          )}
        </>
      )}
    </main>
  )
}

// Una no leída va en negrita, con la etiqueta "Nueva" y el marcador a la izquierda; la leída, sin nada de eso.
function NotificationItem({ notification, onOpen }) {
  const unread = notification.state === 'unread'
  return (
    <button
      type="button"
      className={`${styles.item} ${unread ? styles.unread : ''}`}
      onClick={() => onOpen(notification)}
    >
      <span className={styles.itemTop}>
        <span className={styles.itemTitle}>{notification.title}</span>
        {unread && <span className={styles.tag}>Nueva</span>}
      </span>
      <span className={styles.message}>{notification.message}</span>
      <time className={styles.date} dateTime={notification.created_at}>
        {formatDateTime(notification.created_at)}
      </time>
    </button>
  )
}

export default Notifications
