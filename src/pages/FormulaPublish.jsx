import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import RankingExplanation from '../components/RankingExplanation.jsx'
import { formatDateTime } from '../services/eventFormat.js'
import {
  adjustFormula,
  formatNumber,
  formulaErrorMessage,
  getFormula,
  previewFormula,
  publishFormula,
  withUnit,
} from '../services/formula.js'
import authStyles from './Auth.module.css'
import styles from './Formula.module.css'
import pageStyles from './Page.module.css'

// El servidor acepta coma o punto: se muestra con coma, como en el resto de la app.
function toInput(value) {
  return String(value).replace('.', ',')
}

// Errores que significan que la pantalla quedó desactualizada: hay que recargar.
const RELOAD_CODES = ['STALE_RULES', 'FORMULA_LOCKED', 'SAME_FORMULA_IN_FORCE', 'SEASON_CUTOFF_REACHED']

function loadErrorText(err) {
  return err.code === 'FORMULA_NOT_FOUND' ? 'Esa fórmula no está en el catálogo.' : formulaErrorMessage(err)
}

// Dos constantes pueden llamarse igual (los puntos por mes de cada actividad): ahí el símbolo las distingue.
function constantLabel(constant, constants) {
  const repeated = constants.filter((c) => c.name === constant.name).length > 1
  return repeated ? `${constant.name} (${constant.symbol})` : constant.name
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
  // La explicación se ve en un modal: como vista previa o junto a la confirmación.
  const [previewOpen, setPreviewOpen] = useState(false)
  const dialogRef = useRef(null)

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
      .then((loaded) => {
        if (!ignore) applyDetail(loaded)
      })
      .catch((err) => {
        if (!ignore) setLoadError(loadErrorText(err))
      })
    return () => {
      ignore = true
    }
  }, [id, version, applyDetail])

  const locked = detail?.lock.state === 'locked'
  const cutoffReached = Boolean(detail?.season_cutoff?.reached)
  const isAdjusting = Boolean(detail?.is_in_force)
  const blocked = locked || (isAdjusting && cutoffReached)
  // Vacío cuenta como cambio aunque el original sea 0: Number('') === 0.
  const hasChanges = isAdjusting
    ? Object.entries(detail.values).some(([key, original]) => {
        const current = String(values[key] ?? '')
          .trim()
          .replaceAll(',', '.')
        return current === '' || Number(current) !== Number(original)
      })
    : true
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

  const showDialog = Boolean(preview?.valid) && (previewOpen || confirming)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (showDialog && !dialog.open) dialog.showModal()
    if (!showDialog && dialog.open) dialog.close()
  }, [showDialog])

  async function handleShowPreview() {
    const result = await runPreview()
    if (result?.valid) setPreviewOpen(true)
  }

  function closeDialog() {
    setPreviewOpen(false)
    setConfirming(false)
  }

  function handleDialogClick(event) {
    // Un clic en el fondo oscuro (fuera del contenido) cierra, salvo mientras se guarda.
    if (event.target === dialogRef.current && !busy) closeDialog()
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
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <Link to="/admin/formula" className={pageStyles.back} aria-label="Volver a la fórmula del puntaje">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>{isAdjusting ? 'Ajustar parámetros' : 'Publicar fórmula'}</h1>
        {detail && (
          <p className={pageStyles.lead}>
            <strong>{detail.name}</strong> · versión {detail.version}. {detail.description}
          </p>
        )}
      </header>

      {loadError && (
        <p className={authStyles.error} role="alert">
          {loadError}
        </p>
      )}
      {!loadError && !detail && <p className={styles.muted}>Cargando fórmula…</p>}

      {detail && (
        <>
          {locked && (
            <p className={styles.banner} role="status">
              La fórmula está bloqueada desde el {formatDateTime(detail.lock.changed_at)} por {detail.lock.changed_by}.
              Motivo: {detail.lock.reason}
            </p>
          )}
          {isAdjusting && cutoffReached && (
            <p className={styles.banner} role="status">
              {detail.season_cutoff.message}
            </p>
          )}

          <div className={pageStyles.split}>
            <div className={pageStyles.stack}>
              <form
                className={`${styles.section} ${styles.paramsForm}`}
                onSubmit={handlePublish}
                noValidate
                aria-labelledby="params-title"
              >
                <h2 id="params-title" className={styles.sectionTitle}>
                  Parámetros
                </h2>
                <ul className={styles.list}>
                  {detail.constraints.map((c) => (
                    <li key={c.parameters.join('-')}>
                      {c.label} tienen que sumar {formatNumber(c.total)}.
                    </li>
                  ))}
                </ul>

                {detail.parameters.map((p) => (
                  <div key={p.key} className={`${authStyles.field} ${styles.param}`}>
                    <label htmlFor={`param-${p.key}`} className={authStyles.label}>
                      {p.name}
                      {p.unit ? ` (${p.unit})` : ''}
                    </label>
                    <p className={styles.hint} id={`hint-${p.key}`}>
                      {p.description} Entre {withUnit(p.minimum, p.unit)} y {withUnit(p.maximum, p.unit)}. Por defecto{' '}
                      {withUnit(p.default, p.unit)}.
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
                      <p id={`error-${p.key}`} role="alert" className={authStyles.error}>
                        {byParameter[p.key]}
                      </p>
                    )}
                  </div>
                ))}

                {general.length > 0 && (
                  <div role="alert" className={authStyles.error}>
                    <ul className={styles.violations}>
                      {general.map((v) => (
                        <li key={v.message}>{v.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {error && (
                  <p role="alert" className={authStyles.error}>
                    {error}
                  </p>
                )}
                {needsReload && (
                  <button type="button" className={authStyles.doorSecondary} onClick={reload}>
                    Recargar la pantalla
                  </button>
                )}

                {isAdjusting && !hasChanges && !blocked && (
                  <p className={styles.hint}>Modificá al menos un parámetro para poder ajustar la fórmula.</p>
                )}

                {!confirming && (
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={authStyles.doorSecondary}
                      onClick={handleShowPreview}
                      disabled={busy || blocked}
                    >
                      Ver vista previa
                    </button>
                    <button
                      type="submit"
                      className={authStyles.button}
                      disabled={busy || blocked || (isAdjusting && !hasChanges)}
                    >
                      {busy ? 'Revisando…' : isAdjusting ? 'Ajustar parámetros' : 'Publicar'}
                    </button>
                  </div>
                )}
              </form>
            </div>

            <div className={pageStyles.stack}>
              <section className={styles.section} aria-labelledby="variables-title">
                <h2 id="variables-title" className={styles.sectionTitle}>
                  Variables
                </h2>
                <ul className={styles.list}>
                  {detail.variables.map((v) => (
                    <li key={v.key}>
                      <strong>{v.name}.</strong> {v.description}
                    </li>
                  ))}
                </ul>
              </section>

              <section className={styles.section} aria-labelledby="fixed-title">
                <h2 id="fixed-title" className={styles.sectionTitle}>
                  Constantes y valores derivados
                </h2>
                <p className={styles.hint}>Vienen con la fórmula y no se pueden cambiar.</p>
                <dl className={styles.constants}>
                  {detail.constants.map((c) => (
                    <div key={c.symbol} className={styles.pair}>
                      <dt>{constantLabel(c, detail.constants)}</dt>
                      <dd>{c.value}</dd>
                    </div>
                  ))}
                  {detail.derived_values.map((d) => (
                    <div key={d.symbol} className={styles.pair}>
                      <dt>{d.name}</dt>
                      <dd>{d.expression}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
          </div>

          <dialog
            ref={dialogRef}
            className={styles.dialog}
            aria-labelledby="dialog-title"
            onClick={handleDialogClick}
            onCancel={(event) => {
              if (busy) event.preventDefault()
            }}
            onClose={closeDialog}
          >
            {preview?.valid && (
              <>
                <header className={styles.dialogHeader}>
                  <h2 id="dialog-title" className={styles.sectionTitle}>
                    {!confirming
                      ? 'Así lo van a leer los socios'
                      : isAdjusting
                        ? 'Confirmá el ajuste de parámetros'
                        : 'Confirmá la publicación'}
                  </h2>
                  {confirming ? (
                    <p className={styles.confirmText}>{detail.confirmation_statement}</p>
                  ) : (
                    <p className={styles.hint}>Es una vista previa: no se guardó nada.</p>
                  )}
                </header>
                <div className={styles.dialogBody}>
                  <RankingExplanation explanation={preview.explanation} />
                </div>
                <footer className={styles.dialogActions}>
                  {confirming ? (
                    <>
                      <button type="button" className={authStyles.doorSecondary} onClick={closeDialog} disabled={busy}>
                        Volver a editar
                      </button>
                      <button type="button" className={authStyles.button} onClick={handleConfirm} disabled={busy}>
                        {busy
                          ? isAdjusting
                            ? 'Guardando…'
                            : 'Publicando…'
                          : isAdjusting
                            ? 'Confirmar y guardar'
                            : 'Confirmar y publicar'}
                      </button>
                    </>
                  ) : (
                    <button type="button" className={authStyles.button} onClick={closeDialog} autoFocus>
                      Cerrar
                    </button>
                  )}
                </footer>
              </>
            )}
          </dialog>
        </>
      )}
    </main>
  )
}

export default FormulaPublish
