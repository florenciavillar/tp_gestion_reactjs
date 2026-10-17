import { useLocation } from 'react-router'
import Logo from '../components/Logo.jsx'
import { useAuth } from '../components/authContext.js'
import styles from './Home.module.css'

// Home común a socios y administradores. Las acciones de la cuenta están en el menú de usuario.
function Home() {
  const { user } = useAuth()
  // Aviso que deja la pantalla anterior (por ejemplo, contraseña cambiada).
  const notice = useLocation().state?.notice

  return (
    <main className={styles.page}>
      <Logo />
      <h1 className={styles.greeting}>Welcome, {user.name}</h1>
      {notice && <p className={styles.notice} role="status">{notice}</p>}
    </main>
  )
}

export default Home
