import { Link } from 'react-router'
import Logo from '../components/Logo.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import styles from './Auth.module.css'

function SignIn() {
  function handleSubmit(event) {
    event.preventDefault()
    // TODO: llamar al backend cuando exista el endpoint de login
  }

  return (
    <main className={styles.page}>
      <Logo />

      <section className={styles.card}>
        <h1 className={styles.title}>Login</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="example@gmail.com"
              autoComplete="email"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <PasswordInput
              id="password"
              name="password"
              placeholder="********"
              autoComplete="current-password"
              required
              className={styles.input}
            />
          </div>

          <button type="submit" className={styles.button}>Sign In</button>
        </form>

        {/* TODO: apuntar a la pantalla de recuperar contraseña cuando exista */}
        <a href="#" className={styles.forgot}>Forgot password?</a>

        <p className={styles.switch}>
          Don&apos;t have an account yet? <Link to="/sign-up" className={styles.switchLink}>Sign Up</Link>
        </p>
      </section>
    </main>
  )
}

export default SignIn
