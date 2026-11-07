import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { formatDateTime, formatEventDate, formatEventTime } from '../services/eventFormat.js'
import {
  generateSegmentation,
  getSegmentableEvents,
  getSegmentation,
  getSegmentationPreflight,
  isNoSegmentationError,
  segmentationErrorMessage,
} from '../services/segmentation.js'
import authStyles from './Auth.module.css'
import pageStyles from './Page.module.css'
import runStyles from './RankingRun.module.css'
import styles from './Segmentation.module.css'

// HU-36: olas de un partido. Solo admins.
function SegmentationDetail() {
  const { id } = useParams()
  // Partido que todavía se puede segmentar (publicado y no empezado); null si no está en la lista.
  const [event, setEvent] = useState(null)
  const [segmentation, setSegmentation] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [checking, setChecking] = useState(false)
  const [generating, setGenerating] = useState(false)
  // Confirmación antes de generar. null = no se está pidiendo.
  // { warnings, checked, replacing }: `checked` es false si no se pudieron consultar las advertencias.
  const [confirmation, setConfirmation] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let ignore = false
    Promise.all([
      getSegmentableEvents(),
      getSegmentation(id).catch((err) => {
        if (isNoSegmentationError(err)) return null
        throw err
      }),
    ])
      .then(([items, current]) => {
        if (ignore) return
        setEvent(items.find((item) => item.event.id_interno === id)?.event ?? null)
        setSegmentation(current)
      })
      .catch((err) => {
        if (!ignore) setLoadError(segmentationErrorMessage(err))
      })
      .finally(() => {
        if (!ignore) setLoaded(true)
      })
    return () => {
      ignore = true
    }
  }, [id])

  async function generate(confirmed) {
    setConfirmation(null)
    setGenerating(true)
    setError('')
    setNotice('')
    try {
      const result = await generateSegmentation(id, confirmed)
      setSegmentation(result)
      setNotice(confirmed ? 'Las olas se regeneraron.' : 'Las olas se generaron.')
    } catch (err) {
      if (err.code === 'CONFIRMATION_REQUIRED') {
        // Otro Admin las generó mientras tanto: se muestran y se pide confirmar el reemplazo.
        try {
          setSegmentation(await getSegmentation(id))
        } catch {
          // Se mantiene lo que había.
        }
        setConfirmation({ warnings: [], checked: true, replacing: true })
      } else {
        setError(segmentationErrorMessage(err))
      }
    } finally {
      setGenerating(false)
    }
  }

  // Consulta las advertencias. Sin advertencias y sin olas previas, genera directo.
  async function handleGenerate() {
    setError('')
    setNotice('')
    setChecking(true)
    let warnings = []
    let checked = true
    try {
      warnings = (await getSegmentationPreflight()).warnings
    } catch {
      // Las advertencias no bloquean: si no se pudieron consultar, se avisa y se deja continuar.
      checked = false
    } finally {
      setChecking(false)
    }
    const replacing = segmentation !== null
    if (checked && warnings.length === 0 && !replacing) {
      await generate(false)
      return
    }
    setConfirmation({ warnings, checked, replacing })
  }

  const shownEvent = segmentation?.event ?? event
  const busy = checking || generating || confirmation !== null

  let buttonLabel = segmentation ? 'Regenerar olas' : 'Generar olas'
  if (checking) buttonLabel = 'Verificando datos…'
  else if (generating) buttonLabel = 'Generando…'

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <Link to="/admin/segmentation" className={pageStyles.back} aria-label="Volver a oleadas">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>{shownEvent?.titulo ?? 'Olas del partido'}</h1>
        {shownEvent && (
          <p className={pageStyles.lead}>
            {formatEventDate(shownEvent.fecha_hora)}, {formatEventTime(shownEvent.fecha_hora)} · {shownEvent.lugar}
          </p>
        )}
      </header>

      {loadError && (
        <p className={authStyles.error} role="alert">
          {loadError}
        </p>
      )}
      {!loaded && <p className={runStyles.muted}>Cargando…</p>}

      {loaded && !loadError && !shownEvent && (
        <p className={runStyles.banner} role="status">
          No encontramos este partido entre los próximos partidos publicados. Puede que ya haya empezado.
        </p>
      )}

      {loaded && !loadError && shownEvent && (
        <div className={`${pageStyles.split} ${pageStyles.splitEven}`}>
          <section className={runStyles.section} aria-labelledby="waves-title">
            <h2 id="waves-title" className={runStyles.sectionTitle}>
              Olas
            </h2>
            <div aria-live="polite">
              {segmentation ? (
                <Waves segmentation={segmentation} />
              ) : (
                <p className={runStyles.muted}>Este partido todavía no tiene olas generadas.</p>
              )}
            </div>
            {segmentation && (
              <Link to={`/admin/segmentation/${encodeURIComponent(id)}/schedule`} className={styles.link}>
                Ver cronograma de habilitación
              </Link>
            )}
            s
          </section>

          <section className={`${runStyles.section} ${styles.fitContent}`} aria-labelledby="generate-title">
            <h2 id="generate-title" className={runStyles.sectionTitle}>
              {segmentation ? 'Regenerar' : 'Generar'}
            </h2>
            <p className={runStyles.muted}>
              Se usa el último ranking calculado. Las olas quedan fijas aunque después se recalcule el ranking.
            </p>
            {event === null && segmentation && (
              <p className={runStyles.muted}>El partido ya empezó: no se pueden regenerar las olas.</p>
            )}

            {confirmation && (
              <GenerateConfirmation
                confirmation={confirmation}
                onConfirm={() => generate(confirmation.replacing)}
                onCancel={() => setConfirmation(null)}
              />
            )}

            {error && (
              <div role="alert">
                <p className={authStyles.error}>{error}</p>
              </div>
            )}
            {notice && (
              <p className={runStyles.muted} role="status">
                {notice}
              </p>
            )}

            <button
              type="button"
              className={authStyles.button}
              onClick={handleGenerate}
              disabled={busy || event === null}
            >
              {buttonLabel}
            </button>
          </section>
        </div>
      )}
    </main>
  )
}

function GenerateConfirmation({ confirmation, onConfirm, onCancel }) {
  const { warnings, checked, replacing } = confirmation
  return (
    <div className={runStyles.confirmation} role="alert">
      {!checked && <p className={runStyles.confirmationTitle}>No pudimos verificar si los datos están al día.</p>}
      {warnings.length > 0 && (
        <>
          <p className={runStyles.confirmationTitle}>Antes de generar, revisá estas advertencias:</p>
          <ul className={runStyles.warningList}>
            {warnings.map((warning) => (
              <li key={warning.code} className={runStyles.warning}>
                <span>{warning.message}</span>
                {warning.data_as_of && (
                  <span className={runStyles.warningDate}>Fecha del dato: {formatDateTime(warning.data_as_of)}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {replacing && (
        <p className={runStyles.confirmationTitle}>
          Este partido ya tiene olas. Si continuás, se reemplazan por las nuevas.
        </p>
      )}
      <div className={runStyles.actions}>
        <button type="button" className={authStyles.button} onClick={onConfirm}>
          {replacing ? 'Reemplazar olas' : 'Generar igual'}
        </button>
        <button type="button" className={authStyles.doorSecondary} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function Waves({ segmentation }) {
  const { ranking, waves } = segmentation
  return (
    <>
      <dl className={runStyles.summary}>
        <dt>Ranking usado</dt>
        <dd>
          Calculado el {formatDateTime(ranking.completed_at)} (reglas versión {ranking.rules_version})
        </dd>
        <dt>Socios en el ranking</dt>
        <dd>{segmentation.ranked_total}</dd>
        <dt>Generadas</dt>
        <dd>
          {formatDateTime(segmentation.generated_at)} por {segmentation.generated_by}
        </dd>
      </dl>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Ola</th>
              <th scope="col">Percentil</th>
              <th scope="col">Posiciones</th>
              <th scope="col">Socios</th>
            </tr>
          </thead>
          <tbody>
            {waves.map((wave) => (
              <tr key={wave.order}>
                <td>{wave.order}</td>
                <td>
                  {wave.percentile_from}–{wave.percentile_to} %
                </td>
                <td>
                  {wave.position_from === wave.position_to
                    ? wave.position_from
                    : `${wave.position_from} a ${wave.position_to}`}
                </td>
                <td>{wave.socios}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default SegmentationDetail
