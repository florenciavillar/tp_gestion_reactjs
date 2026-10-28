import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import Logo from '../components/Logo.jsx'
import RankingExplanation from '../components/RankingExplanation.jsx'
import { formatDateTime } from '../services/eventFormat.js'
import { adjustFormula, formatNumber, formulaErrorMessage, getFormula, previewFormula, publishFormula, withUnit } from '../services/formula.js'
import authStyles from './Auth.module.css'
import styles from './Formula.module.css'

// El servidor acepta coma o punto: se muestra con coma, como en el resto de la app.
function toInput(value) {
  return String(value).replace('.', ',')
}

// Errores que significan que la pantalla quedó desactualizada: hay que recargar.
const RELOAD_CODES = ['STALE_RULES', 'FORMULA_LOCKED', 'SAME_FORMULA_IN_FORCE', 'SEASON_CUTOFF_REACHED']

function loadErrorText(err) {
  return err.code === 'FORMULA_NOT_FOUND' ? 'Esa fórmula no está en el catálogo.' : formulaErrorMessage(err)
}

// HU-27 / HU-28: el Admin configura una fórmula del catálogo o ajusta los parámetros de la vigente,
// ve la vista previa de lo que van a leer los socios y confirma.
function FormulaPublish() {
  const { id, version } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [values, setValues] = useState({})
  const [preview, setPreview] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [needsReload, setNeedsReload] = useState(false)
  const [busy, setBusy] = useState(false)

  const applyDetail = useCallback((loaded) => {
    setDetail(loaded)
    setValues(Object.fromEntries(Object.entries(loaded.values).map(([key, value]) => [key, toInput(value)])))
    setPreview(null)
    setConfirming(false)
    setError('')
    setNeedsReload(false)
    setLoadError('')
  }, [])

  // Recarga cuando la pantalla quedó desactualizada (otro Admin publicó o bloqueó).
  async function reload() {
    try {
      applyDetail(await getFormula(id, version))
    } catch (err) {
      setLoadError(loadErrorText(err))
    }
  }

  useEffect(() => {
    let ignore = false
    getFormula(id, version)
      .then((loaded) => { if (!ignore) applyDetail(loaded) })
      .catch((err) => { if (!ignore) setLoadError(loadErrorText(err)) })
    return () => { ignore = true }
  }, [id, version, applyDetail])

  const locked = detail?.lock.state === 'locked'
  const cutoffReached = Boolean(detail?.season_cutoff?.reached)
  const isAdjusting = Boolean(detail?.is_in_force)
  const blocked = locked || (isAdjusting && cutoffReached)
  const violations = preview && !preview.valid ? preview.violations : []
  const byParameter = Object.fromEntries(violations.filter((v) => v.parameter).map((v) => [v.parameter, v.message]))
  const general = violations.filter((v) => !v.parameter)

  function handleChange(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
    // Lo que se vio ya no corresponde a lo que se escribió.
    setPreview(null)
    setConfirming(false)
    setError('')
  }

  async function runPreview() {
    setBusy(true)
    setError('')
    try {
      const result = await previewFormula(id, version, values)
      setPreview(result)
      return result
    } catch (err) {
      setError(formulaErrorMessage(err))
      return null
    } finally {
      setBusy(false)
    }
  }

  async function handlePublish(event) {
    event.preventDefault()
    const result = await runPreview()
    if (result?.valid) setConfirming(true)
  }

  async function handleConfirm() {
    setBusy(true)
    setError('')
    try {
      const result = await (isAdjusting
        ? adjustFormula({
            values,
            expectedRulesVersion: detail.rules_version_in_force,
          })
        : publishFormula(id, version, {
            values,
            expectedRulesVersion: detail.rules_version_in_force,
          }))
      navigate('/admin/formula', { state: { notice: result.message } })
    } catch (err) {
      setConfirming(false)
      if (err.code === 'INVALID_VALUES' && err.violations) {
        setPreview({ valid: false, violations: err.violations, explanation: null })
      } else {
        setError(formulaErrorMessage(err))
        setNeedsReload(RELOAD_CODES.includes(err.code))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={authStyles.page}>
      <Logo />
      <section className={`${authStyles.card} ${styles.card}`}>
        <Link to="/admin/formula" className={authStyles.back} aria-label="Volver a la fórmula del puntaje">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={authStyles.title}>{isAdjusting ? 'Ajustar parámetros' : 'Publicar fórmula'}</h1>

        {loadError && <p className={authStyles.error} role="alert">{loadError}</p>}
        {!loadError && !detail && <p className={authStyles.message}>Cargando fórmula…</p>}

        {detail && (
          <>
            <p className={styles.muted}>
              <strong>{detail.name}</strong> · versión {detail.version}. {detail.description}
            </p>

            {locked && (
              <p className={styles.banner} role="status">
                La fórmula está bloqueada desde el {formatDateTime(detail.lock.changed_at)} por {detail.lock.changed_by}.
                Motivo: {detail.lock.reason}
              </p>
            )}
            {cutoffReached && (
              <p className={styles.banner} role="status">
                {detail.season_cutoff.message}
              </p>
            )}

            <section className={styles.section} aria-labelledby="variables-title">
              <h2 id="variables-title" className={styles.sectionTitle}>Variables</h2>
              <ul className={styles.list}>
                {detail.variables.map((v) => (
                  <li key={v.key}><strong>{v.name}.</strong> {v.description}</li>
                ))}
              </ul>
            </section>

            <section className={styles.section} aria-labelledby="fixed-title">
              <h2 id="fixed-title" className={styles.sectionTitle}>Constantes y valores derivados</h2>
              <p className={styles.hint}>Vienen con la fórmula y no se pueden cambiar.</p>
              <dl className={styles.summary}>
                {detail.constants.map((c) => (
                  <div key={c.symbol} className={styles.pair}>
                    <dt>{c.symbol}</dt>
                    <dd>{c.name}: {c.value}</dd>
                  </div>
                ))}
                {detail.derived_values.map((d) => (
                  <div key={d.symbol} className={styles.pair}>
                    <dt>{d.symbol}</dt>
                    <dd>{d.name}: {d.expression}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <form className={styles.section} onSubmit={handlePublish} noValidate aria-labelledby="params-title">
              <h2 id="params-title" className={styles.sectionTitle}>Parámetros</h2>
              <ul className={styles.list}>
                {detail.constraints.map((c) => (
                  <li key={c.parameters.join('-')}>{c.label} tienen que sumar {formatNumber(c.total)}.</li>
                ))}
              </ul>

              {detail.parameters.map((p) => (
                <div key={p.key} className={`${authStyles.field} ${styles.param}`}>
                  <label htmlFor={`param-${p.key}`} className={authStyles.label}>
                    {p.name} ({p.symbol}){p.unit ? ` · ${p.unit}` : ''}
                  </label>
                  <p className={styles.hint} id={`hint-${p.key}`}>
                    {p.description} Entre {withUnit(p.minimum, p.unit)} y {withUnit(p.maximum, p.unit)}. Por defecto {withUnit(p.default, p.unit)}.
                  </p>
                  <input
                    id={`param-${p.key}`}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={values[p.key] ?? ''}
                    onChange={(event) => handleChange(p.key, event.target.value)}
                    disabled={blocked}
                    aria-invalid={byParameter[p.key] ? 'true' : undefined}
                    aria-describedby={`hint-${p.key}${byParameter[p.key] ? ` error-${p.key}` : ''}`}
                    className={authStyles.input}
                  />
                  {byParameter[p.key] && (
                    <p id={`error-${p.key}`} role="alert" className={authStyles.error}>{byParameter[p.key]}</p>
                  )}
                </div>
              ))}

              {general.length > 0 && (
                <div role="alert" className={authStyles.error}>
                  <ul className={styles.violations}>
                    {general.map((v) => <li key={v.message}>{v.message}</li>)}
                  </ul>
                </div>
              )}
              {error && <p role="alert" className={authStyles.error}>{error}</p>}
              {needsReload && (
                <button type="button" className={authStyles.doorSecondary} onClick={reload}>
                  Recargar la pantalla
                </button>
              )}

              {!confirming && (
                <div className={styles.actions}>
                  <button type="button" className={authStyles.doorSecondary} onClick={runPreview} disabled={busy || blocked}>
                    Ver vista previa
                  </button>
                  <button type="submit" className={authStyles.button} disabled={busy || blocked}>
                    {busy ? 'Revisando…' : isAdjusting ? 'Ajustar parámetros' : 'Publicar'}
                  </button>
                </div>
              )}
            </form>

            {confirming && preview?.valid && (
              <section className={styles.confirm} aria-labelledby="confirm-title">
                <h2 id="confirm-title" className={styles.sectionTitle}>
                  {isAdjusting ? 'Confirmá el ajuste de parámetros' : 'Confirmá la publicación'}
                </h2>
                <p className={styles.confirmText}>{detail.confirmation_statement}</p>
                <div className={styles.actions}>
                  <button type="button" className={authStyles.button} onClick={handleConfirm} disabled={busy}>
                    {busy ? (isAdjusting ? 'Guardando…' : 'Publicando…') : isAdjusting ? 'Confirmar y guardar' : 'Confirmar y publicar'}
                  </button>
                  <button type="button" className={authStyles.doorSecondary} onClick={() => setConfirming(false)} disabled={busy}>
                    Volver a editar
                  </button>
                </div>
              </section>
            )}

            {preview?.valid && (
              <section className={styles.section} aria-labelledby="preview-title">
                <h2 id="preview-title" className={styles.sectionTitle}>Así lo van a leer los socios</h2>
                <p className={styles.hint}>Es una vista previa: no se guardó nada.</p>
                <RankingExplanation explanation={preview.explanation} />
              </section>
            )}
          </>
        )}
      </section>
    </main>
  )
}

export default FormulaPublish
