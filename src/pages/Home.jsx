import { useLocation } from 'react-router'
import Logo from '../components/Logo.jsx'
import PendingEvents from '../components/PendingEvents.jsx'
import UpcomingEvents from '../components/UpcomingEvents.jsx'
import { useAuth } from '../components/authContext.js'
import styles from './Home.module.css'

// Home común a socios y administradores. Las acciones de la cuenta están en el menú de usuario.
// El socio ve sus próximos eventos (HU-17) y el Admin los eventos pendientes de publicar (HU-22).
function Home() {
  const { user } = useAuth()
  // Aviso que deja la pantalla anterior (por ejemplo, evento publicado).
  const notice = useLocation().state?.notice

  return (
    <main className={styles.page}>
      <Logo />
      <h1 className={styles.greeting}>Hola, {user.name}</h1>
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {user.role === 'member' && <UpcomingEvents />}
      {user.role === 'admin' && <PendingEvents />}
    </main>
  )
}

export default Home
