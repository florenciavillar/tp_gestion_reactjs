import { useCallback, useEffect, useId, useState } from 'react'
import { Link, useLocation } from 'react-router'
import Logo from '../components/Logo.jsx'
import RankingExplanation from '../components/RankingExplanation.jsx'
import { formatDateTime } from '../services/eventFormat.js'
import { formulaErrorMessage, getFormulas, lockFormula, unlockFormula, withUnit } from '../services/formula.js'
import authStyles from './Auth.module.css'
import styles from './Formula.module.css'

// HU-27 / HU-28: catálogo de fórmulas, reglas vigentes del club y bloqueo. Solo admins.
function FormulaSettings() {
  const location = useLocation()
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState(location.state?.notice ?? '')
  const [reasonOpen, setReasonOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const reasonId = useId()

  // Recarga después de un cambio de bloqueo.
  const load = useCallback(async () => {
    try {
      setData(await getFormulas())
      setLoadError('')
    } catch (err) {
      setLoadError(formulaErrorMessage(err))
    }
  }, [])

  useEffect(() => {
    let ignore = false
    getFormulas()
      .then((result) => { if (!ignore) setData(result) })
      .catch((err) => { if (!ignore) setLoadError(formulaErrorMessage(err)) })
    return () => { ignore = true }
  }, [])

  const locked = data?.lock.state === 'locked'

  async function handleLockChange(event) {
    event.preventDefault()
    if (!reason.trim()) {
      setError('Indicá el motivo.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await (locked ? unlockFormula(reason) : lockFormula(reason))
      setNotice(locked ? 'Desbloqueaste la fórmula.' : 'Bloqueaste la fórmula.')
      setReason('')
      setReasonOpen(false)
      await load()
    } catch (err) {
      setError(formulaErrorMessage(err))
      // Otro Admin pudo cambiar el estado mientras tanto: se vuelve a leer.
      if (err.status === 409) await load()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={authStyles.page}>
      <Logo />
      <section className={`${authStyles.card} ${styles.card}`}>
        <Link to="/" className={authStyles.back} aria-label="Volver al inicio">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={authStyles.title}>Fórmula del puntaje</h1>

        {notice && <p className={styles.notice} role="status">{notice}</p>}
        {loadError && <p className={authStyles.error} role="alert">{loadError}</p>}
        {!loadError && !data && <p className={authStyles.message}>Cargando…</p>}

        {data && (
          <>
            <section className={styles.section} aria-labelledby="lock-title">
              <h2 id="lock-title" className={styles.sectionTitle}>Bloqueo</h2>
              <span className={`${styles.pill} ${locked ? styles.pillLocked : ''}`}>
                {locked ? 'Bloqueada' : 'Desbloqueada'}
              </span>
              {locked ? (
                <p className={styles.banner}>
                  Bloqueada desde el {formatDateTime(data.lock.changed_at)} por {data.lock.changed_by}.
                  Motivo: {data.lock.reason}
                </p>
              ) : (
                <p className={styles.muted}>
                  Con la fórmula bloqueada no se puede publicar otra ni ajustar parámetros. No afecta el ranking ni lo que ven los socios.
                </p>
              )}

              {reasonOpen ? (
                <form className={authStyles.form} onSubmit={handleLockChange} noValidate>
                  <div className={authStyles.field}>
                    <label htmlFor={reasonId} className={authStyles.label}>Motivo</label>
                    <textarea
                      id={reasonId}
                      value={reason}
                      maxLength={500}
                      onChange={(event) => setReason(event.target.value)}
                      aria-invalid={error ? 'true' : undefined}
                      className={`${authStyles.input} ${styles.textarea}`}
                    />
                  </div>
                  {error && <p role="alert" className={authStyles.error}>{error}</p>}
                  <div className={styles.actions}>
                    <button type="submit" className={authStyles.button} disabled={submitting}>
                      {submitting ? 'Guardando…' : locked ? 'Confirmar desbloqueo' : 'Confirmar bloqueo'}
                    </button>
                    <button
                      type="button"
                      className={authStyles.doorSecondary}
                      onClick={() => { setReasonOpen(false); setError('') }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className={authStyles.doorSecondary}
                  onClick={() => { setReasonOpen(true); setNotice('') }}
                >
                  {locked ? 'Desbloquear fórmula' : 'Bloquear fórmula'}
                </button>
              )}
            </section>

            <section className={styles.section} aria-labelledby="force-title">
              <h2 id="force-title" className={styles.sectionTitle}>Reglas vigentes</h2>
              {data.in_force ? (
                <>
                  <dl className={styles.summary}>
                    <dt>Versión de reglas</dt>
                    <dd>{data.in_force.number}</dd>
                    <dt>Fórmula</dt>
                    <dd>{data.in_force.formula_name} (versión {data.in_force.formula_version})</dd>
                    <dt>Publicadas</dt>
                    <dd>el {formatDateTime(data.in_force.published_at)} por {data.in_force.published_by}</dd>
                  </dl>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <caption className={styles.srOnly}>Valores de los parámetros vigentes</caption>
                      <thead>
                        <tr><th scope="col">Parámetro</th><th scope="col">Valor</th></tr>
                      </thead>
                      <tbody>
                        {data.in_force.parameters.map((p) => (
                          <tr key={p.key}>
                            <td>{p.name} ({p.symbol})</td>
                            <td>{withUnit(p.value, p.unit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <details className={styles.details}>
                    <summary>Ver la explicación que leen los socios</summary>
                    <RankingExplanation explanation={data.in_force.explanation} />
                  </details>
                </>
              ) : (
                <p className={styles.muted}>
                  Todavía no hay reglas vigentes: el club no publicó ninguna fórmula. Hasta entonces no se puede calcular el ranking ni ajustar parámetros.
                </p>
              )}
            </section>

            <section className={styles.section} aria-labelledby="catalog-title">
              <h2 id="catalog-title" className={styles.sectionTitle}>Catálogo de fórmulas</h2>
              <ul className={styles.catalog}>
                {data.catalog.map((formula) => {
                  const inForce = data.in_force?.formula_id === formula.id && data.in_force?.formula_version === formula.version
                  return (
                    <li key={`${formula.id}-${formula.version}`} className={styles.catalogItem}>
                      <div className={styles.catalogHead}>
                        <h3 className={styles.catalogName}>{formula.name}</h3>
                        <span className={styles.muted}>Versión {formula.version}</span>
                        {inForce && <span className={styles.pill}>Vigente</span>}
                      </div>
                      <p className={styles.muted}>{formula.description}</p>
                      <Link
                        to={`/admin/formula/${encodeURIComponent(formula.id)}/${formula.version}`}
                        className={inForce ? authStyles.doorSecondary : authStyles.door}
                      >
                        {inForce ? 'Ajustar parámetros' : 'Configurar y publicar'}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          </>
        )}
      </section>
    </main>
  )
}

export default FormulaSettings
