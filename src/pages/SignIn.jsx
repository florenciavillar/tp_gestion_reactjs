import { Link, useLocation } from 'react-router'
import Logo from '../components/Logo.jsx'
import styles from './Auth.module.css'

// Pantalla inicial (HU-00): dos puertas, una para socios y otra para admins. Cada una tiene sus cuentas.
function SignIn() {
  // Aviso que deja la pantalla anterior (por ejemplo, la sesión cerrada).
  const notice = useLocation().state?.notice

  return (
    <main className={styles.page}>
      <Logo />

      <section className={styles.card}>
        <h1 className={styles.title}>Welcome</h1>

        {notice && <p className={styles.message} role="status">{notice}</p>}

        <nav className={styles.doors} aria-label="Choose how to log in">
          <Link to="/sign-in/member" className={styles.door}>Member access</Link>
          <Link to="/sign-in/admin" className={styles.doorSecondary}>Admin access</Link>
        </nav>

        <p className={styles.switch}>
          First time as a member? <Link to="/sign-up" className={styles.switchLink}>Activate your account</Link>
        </p>
      </section>
    </main>
  )
}

export default SignIn
