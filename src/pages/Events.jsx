import { useLocation } from 'react-router'
import EventChangesReview from '../components/EventChangesReview.jsx'
import PendingEvents from '../components/PendingEvents.jsx'
import UpcomingEvents from '../components/UpcomingEvents.jsx'
import { useAuth } from '../components/authContext.js'
import styles from './Home.module.css'
import pageStyles from './Page.module.css'

// Pantalla de eventos. El socio ve sus próximos eventos (HU-17) y el Admin los pendientes de publicar (HU-22)
// y las solicitudes de reprogramación/retiro (HU-23).
function Events() {
  const { user } = useAuth()
  // Aviso que deja la pantalla anterior (por ejemplo, evento publicado).
  const notice = useLocation().state?.notice

  return (
    <main className={pageStyles.page}>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {user.role === 'member' && <UpcomingEvents />}
      {user.role === 'admin' && (
        <>
          <PendingEvents />
          <EventChangesReview />
        </>
      )}
    </main>
  )
}

export default Events
