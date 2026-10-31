import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  approveReplacement,
  downloadRejectionsCSV,
  getEligibleEvents,
  getPendingApprovals,
  rejectReplacement,
  uploadActivitiesCSV,
  uploadAttendanceCSV,
} from '../services/attendance.js'
import { formatEventDate, formatEventTime } from '../services/eventFormat.js'
import styles from './AttendanceManagement.module.css'
import pageStyles from './Page.module.css'

function AttendanceManagement() {
  const [tab, setTab] = useState('asistencia') // 'asistencia' | 'actividades' | 'aprobaciones'

  // Datos
  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [loadingApprovals, setLoadingApprovals] = useState(true)

  // Formulario Asistencia
  const [selectedEventId, setSelectedEventId] = useState('')
  const [attendanceFile, setAttendanceFile] = useState(null)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [attendanceSubmitting, setAttendanceSubmitting] = useState(false)
  const [attendanceResult, setAttendanceResult] = useState(null)
  const [attendanceError, setAttendanceError] = useState(null)

  // Formulario Actividades
  const [activitiesFile, setActivitiesFile] = useState(null)
  const [activitiesSubmitting, setActivitiesSubmitting] = useState(false)
  const [activitiesResult, setActivitiesResult] = useState(null)
  const [activitiesError, setActivitiesError] = useState(null)

  // Acciones en aprobaciones
  const [approvalActionError, setApprovalActionError] = useState(null)
  const [approvalActionSuccess, setApprovalActionSuccess] = useState(null)
  const [processingApprovalId, setProcessingApprovalId] = useState(null)

  const attendanceFileInputRef = useRef(null)
  const activitiesFileInputRef = useRef(null)

  const eventSelectId = useId()
  const attendanceFileId = useId()
  const activitiesFileId = useId()
  const replaceConfirmId = useId()

  // Cargar eventos elegibles
  useEffect(() => {
    let ignore = false
    getEligibleEvents()
      .then((data) => {
        if (!ignore) {
          setEvents(data)
          if (data.length > 0) {
            setSelectedEventId(data[0].id_externo)
          }
        }
      })
      .catch((err) => {
        if (!ignore) setAttendanceError(err.reason || err.message)
      })
      .finally(() => {
        if (!ignore) setLoadingEvents(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  // Cargar pendientes de aprobación
  const loadApprovals = () => {
    setLoadingApprovals(true)
    getPendingApprovals()
      .then((data) => setPendingApprovals(data))
      .catch(() => {})
      .finally(() => setLoadingApprovals(false))
  }

  useEffect(() => {
    let ignore = false
    getPendingApprovals()
      .then((data) => {
        if (!ignore) setPendingApprovals(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoadingApprovals(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  const selectedEvent = events.find((e) => e.id_externo === selectedEventId)
  const hasPreviousAttendance = selectedEvent?.tiene_asistencia_previa

  // Manejar subida de asistencia
  async function handleAttendanceSubmit(e) {
    e.preventDefault()
    if (!selectedEventId || !attendanceFile) return

    setAttendanceSubmitting(true)
    setAttendanceResult(null)
    setAttendanceError(null)

    try {
      const res = await uploadAttendanceCSV(
        selectedEventId,
        attendanceFile,
        confirmReplace,
      )
      setAttendanceResult(res)
      if (res.requiere_confirmacion_reemplazo) {
        setAttendanceError(
          'El evento ya posee asistencia previa. Marcá la casilla de confirmación para reemplazarla.',
        )
      } else {
        // Limpiar archivo seleccionado tras éxito
        setAttendanceFile(null)
        if (attendanceFileInputRef.current) attendanceFileInputRef.current.value = ''
        // Actualizar lista de eventos para reflejar que ahora tiene asistencia
        getEligibleEvents().then((d) => setEvents(d))
      }
    } catch (err) {
      setAttendanceError(err.reason || err.message || 'Error al procesar el archivo CSV')
    } finally {
      setAttendanceSubmitting(false)
    }
  }

  // Manejar subida de actividades
  async function handleActivitiesSubmit(e) {
    e.preventDefault()
    if (!activitiesFile) return

    setActivitiesSubmitting(true)
    setActivitiesResult(null)
    setActivitiesError(null)

    try {
      const res = await uploadActivitiesCSV(activitiesFile)
      setActivitiesResult(res)
      setActivitiesFile(null)
      if (activitiesFileInputRef.current) activitiesFileInputRef.current.value = ''
    } catch (err) {
      setActivitiesError(err.reason || err.message || 'Error al procesar el archivo CSV')
    } finally {
      setActivitiesSubmitting(false)
    }
  }

  // Manejar aprobación de reemplazo
  async function handleApprove(cargaId) {
    setProcessingApprovalId(cargaId)
    setApprovalActionError(null)
    setApprovalActionSuccess(null)
    try {
      await approveReplacement(cargaId)
      setApprovalActionSuccess(`La carga ${cargaId} fue aprobada y aplicada con éxito.`)
      loadApprovals()
      getEligibleEvents().then((d) => setEvents(d))
    } catch (err) {
      setApprovalActionError(err.reason || err.message || 'Error al aprobar la carga.')
    } finally {
      setProcessingApprovalId(null)
    }
  }

  // Manejar rechazo de reemplazo
  async function handleReject(cargaId) {
    const motivo = window.prompt('Ingresá el motivo del rechazo (opcional):')
    if (motivo === null) return // Usuario canceló el prompt

    setProcessingApprovalId(cargaId)
    setApprovalActionError(null)
    setApprovalActionSuccess(null)
    try {
      await rejectReplacement(cargaId, motivo)
      setApprovalActionSuccess(`La carga ${cargaId} fue rechazada. La asistencia previa se mantiene intacta.`)
      loadApprovals()
    } catch (err) {
      setApprovalActionError(err.reason || err.message || 'Error al rechazar la carga.')
    } finally {
      setProcessingApprovalId(null)
    }
  }

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <Link to="/" className={pageStyles.back} aria-label="Volver al inicio">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>Carga de asistencias y actividades</h1>
        <p className={pageStyles.lead}>
          Cargá la asistencia de eventos ya ocurridos o actividades recurrentes mediante archivos CSV.
          Aplica tolerancia máxima de error del 5% y confirmación de reemplazos.
        </p>
      </header>

      {/* Selector de Pestañas */}
      <nav role="tablist" aria-label="Secciones de carga de participación" className={styles.tabList}>
        <button
          role="tab"
          type="button"
          aria-selected={tab === 'asistencia'}
          className={styles.tabButton}
          onClick={() => setTab('asistencia')}
        >
          Asistencia a un evento
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={tab === 'actividades'}
          className={styles.tabButton}
          onClick={() => setTab('actividades')}
        >
          Actividades recurrentes
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={tab === 'aprobaciones'}
          className={styles.tabButton}
          onClick={() => {
            setTab('aprobaciones')
            loadApprovals()
          }}
        >
          Aprobaciones pendientes
          {pendingApprovals.length > 0 && (
            <span className={styles.badgePending} title={`${pendingApprovals.length} cargas pendientes`}>
              {pendingApprovals.length}
            </span>
          )}
        </button>
      </nav>

      {/* PESTAÑA 1: ASISTENCIA A UN EVENTO */}
      {tab === 'asistencia' && (
        <div className={styles.panel}>
          <form className={styles.formCard} onSubmit={handleAttendanceSubmit}>
            <div className={styles.fieldGroup}>
              <label htmlFor={eventSelectId} className={styles.label}>
                Seleccionar evento ocurrido:
              </label>
              {loadingEvents ? (
                <p className={styles.hint}>Cargando eventos elegibles…</p>
              ) : events.length === 0 ? (
                <p className={styles.hint}>No hay eventos finalizados elegibles para cargar asistencia.</p>
              ) : (
                <select
                  id={eventSelectId}
                  className={styles.select}
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value)
                    setConfirmReplace(false)
                    setAttendanceResult(null)
                  }}
                  required
                >
                  {events.map((evt) => (
                    <option key={evt.id_externo} value={evt.id_externo}>
                      {evt.titulo} — {formatEventDate(evt.fecha_hora)} {formatEventTime(evt.fecha_hora)} ({evt.tipo})
                      {evt.tiene_asistencia_previa ? ' [Con asistencia previa]' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Aviso si ya posee asistencia previa */}
            {hasPreviousAttendance && (
              <div className={styles.warningBox} role="alert">
                <div className={styles.warningHeader}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>El evento ya posee asistencia cargada</span>
                </div>
                <p className={styles.warningText}>
                  Si subís un nuevo archivo, la asistencia actual será reemplazada de forma atómica y archivada en el historial.
                </p>
                <label htmlFor={replaceConfirmId} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    id={replaceConfirmId}
                    checked={confirmReplace}
                    onChange={(e) => setConfirmReplace(e.target.checked)}
                  />
                  <span>Confirmo que deseo reemplazar la asistencia previa de este evento</span>
                </label>
              </div>
            )}

            {/* Selección de Archivo CSV */}
            <div className={styles.fieldGroup}>
              <label htmlFor={attendanceFileId} className={styles.label}>
                Archivo CSV de asistencias:
              </label>
              <p className={styles.hint}>
                Columnas requeridas: <code>dni</code> y opcionalmente <code>numero_socio</code>, <code>fecha_evento</code>.
                Codificación UTF-8, máximo 10 MB y hasta 100.000 filas.
              </p>
              <label htmlFor={attendanceFileId} className={styles.fileUploadBox}>
                <input
                  ref={attendanceFileInputRef}
                  type="file"
                  id={attendanceFileId}
                  accept=".csv,text/csv"
                  onChange={(e) => setAttendanceFile(e.target.files?.[0] || null)}
                  required
                />
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {attendanceFile ? (
                  <span className={styles.fileChosen}>
                    ✓ {attendanceFile.name} ({(attendanceFile.size / 1024).toFixed(1)} KB)
                  </span>
                ) : (
                  <span>Hacé clic acá para seleccionar el archivo CSV</span>
                )}
              </label>
            </div>

            {/* Error Message */}
            {attendanceError && (
              <div className={styles.alertError} role="alert">
                <strong>Error:</strong> {attendanceError}
              </div>
            )}

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={
                attendanceSubmitting ||
                !attendanceFile ||
                !selectedEventId ||
                (hasPreviousAttendance && !confirmReplace)
              }
            >
              {attendanceSubmitting ? 'Procesando archivo…' : 'Subir y aplicar asistencia'}
            </button>
          </form>

          {/* Resultado de la carga de asistencia */}
          {attendanceResult && !attendanceResult.requiere_confirmacion_reemplazo && (
            <div className={`${styles.resultBox} ${styles.resultSuccess}`} role="status">
              <div className={styles.resultHeader}>
                <h2 className={styles.resultTitle}>Resultado de la carga de asistencia</h2>
                <span className={styles.badgeSuccess}>
                  {attendanceResult.estado}
                </span>
              </div>
              <p className={styles.resultText}>{attendanceResult.mensaje}</p>

              <div className={styles.statsRow}>
                <div className={styles.statCard}>
                  <span className={styles.statNumber}>{attendanceResult.total_registros}</span>
                  <span className={styles.statLabel}>Total filas</span>
                </div>
                <div className={styles.statCard}>
                  <span className={`${styles.statNumber} ${styles.green}`}>
                    {attendanceResult.registros_incorporados}
                  </span>
                  <span className={styles.statLabel}>Incorporados</span>
                </div>
                <div className={styles.statCard}>
                  <span className={`${styles.statNumber} ${attendanceResult.registros_rechazados > 0 ? styles.red : ''}`}>
                    {attendanceResult.registros_rechazados}
                  </span>
                  <span className={styles.statLabel}>Rechazados</span>
                </div>
              </div>

              {attendanceResult.registros_rechazados > 0 && (
                <div className={styles.rejectionsSection}>
                  <div className={styles.rejectionsHeader}>
                    <span className={styles.rejectionsCount}>
                      Se rechazaron {attendanceResult.registros_rechazados} registros (dentro de la tolerancia del 5%)
                    </span>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => downloadRejectionsCSV(attendanceResult.carga_id)}
                    >
                      Descargar CSV de rechazos
                    </button>
                  </div>

                  <table className={styles.rejectionsTable}>
                    <thead>
                      <tr>
                        <th>Fila</th>
                        <th>DNI</th>
                        <th>Campo</th>
                        <th>Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceResult.rechazos.slice(0, 5).map((r, i) => (
                        <tr key={i}>
                          <td>{r.fila ?? '-'}</td>
                          <td>{r.dni ?? '-'}</td>
                          <td><code>{r.field || r.campo || '-'}</code></td>
                          <td>{r.motivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {attendanceResult.rechazos.length > 5 && (
                    <span className={styles.hint}>
                      Y {attendanceResult.rechazos.length - 5} rechazos más en el archivo descargable.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: ACTIVIDADES RECURRENTES */}
      {tab === 'actividades' && (
        <div className={styles.panel}>
          <form className={styles.formCard} onSubmit={handleActivitiesSubmit}>
            <div className={styles.fieldGroup}>
              <h2 className={styles.resultTitle}>Carga de actividades recurrentes</h2>
              <p className={styles.hint}>
                Registra la participación continua de socios en <strong>deportes federados</strong> o <strong>subcomisiones</strong>.
                Las actividades repetidas con la misma fecha de inicio se actualizan automáticamente (upsert).
              </p>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor={activitiesFileId} className={styles.label}>
                Archivo CSV de actividades:
              </label>
              <p className={styles.hint}>
                Columnas requeridas: <code>dni,tipo,fecha_desde,fecha_hasta</code>.
                Los valores válidos para <code>tipo</code> son <code>deporte_federado</code> o <code>subcomision</code>.
              </p>

              <label htmlFor={activitiesFileId} className={styles.fileUploadBox}>
                <input
                  ref={activitiesFileInputRef}
                  type="file"
                  id={activitiesFileId}
                  accept=".csv,text/csv"
                  onChange={(e) => setActivitiesFile(e.target.files?.[0] || null)}
                  required
                />
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {activitiesFile ? (
                  <span className={styles.fileChosen}>
                    ✓ {activitiesFile.name} ({(activitiesFile.size / 1024).toFixed(1)} KB)
                  </span>
                ) : (
                  <span>Hacé clic acá para seleccionar el archivo CSV de actividades</span>
                )}
              </label>
            </div>

            {activitiesError && (
              <div className={styles.alertError} role="alert">
                <strong>Error:</strong> {activitiesError}
              </div>
            )}

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={activitiesSubmitting || !activitiesFile}
            >
              {activitiesSubmitting ? 'Procesando archivo…' : 'Subir y aplicar actividades'}
            </button>
          </form>

          {/* Resultado de la carga de actividades */}
          {activitiesResult && (
            <div className={`${styles.resultBox} ${styles.resultSuccess}`} role="status">
              <div className={styles.resultHeader}>
                <h2 className={styles.resultTitle}>Resultado de la carga de actividades</h2>
                <span className={styles.badgeSuccess}>
                  {activitiesResult.estado}
                </span>
              </div>
              <p className={styles.resultText}>{activitiesResult.mensaje}</p>

              <div className={styles.statsRow}>
                <div className={styles.statCard}>
                  <span className={styles.statNumber}>{activitiesResult.total_registros}</span>
                  <span className={styles.statLabel}>Total filas</span>
                </div>
                <div className={styles.statCard}>
                  <span className={`${styles.statNumber} ${styles.green}`}>
                    {activitiesResult.registros_incorporados}
                  </span>
                  <span className={styles.statLabel}>Incorporados</span>
                </div>
                <div className={styles.statCard}>
                  <span className={`${styles.statNumber} ${styles.blue}`}>
                    {activitiesResult.registros_actualizados}
                  </span>
                  <span className={styles.statLabel}>Actualizados</span>
                </div>
                <div className={styles.statCard}>
                  <span className={`${styles.statNumber} ${activitiesResult.registros_rechazados > 0 ? styles.red : ''}`}>
                    {activitiesResult.registros_rechazados}
                  </span>
                  <span className={styles.statLabel}>Rechazados</span>
                </div>
              </div>

              {activitiesResult.registros_rechazados > 0 && (
                <div className={styles.rejectionsSection}>
                  <div className={styles.rejectionsHeader}>
                    <span className={styles.rejectionsCount}>
                      Se rechazaron {activitiesResult.registros_rechazados} registros
                    </span>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => downloadRejectionsCSV(activitiesResult.carga_id)}
                    >
                      Descargar CSV de rechazos
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 3: APROBACIONES PENDIENTES */}
      {tab === 'aprobaciones' && (
        <div className={styles.panel}>
          {approvalActionSuccess && (
            <div className={styles.alertSuccess} role="status">
              ✓ {approvalActionSuccess}
            </div>
          )}

          {approvalActionError && (
            <div className={styles.alertError} role="alert">
              <strong>Error:</strong> {approvalActionError}
            </div>
          )}

          {loadingApprovals ? (
            <p className={styles.hint}>Consultando reemplazos pendientes…</p>
          ) : pendingApprovals.length === 0 ? (
            <p className={styles.emptyState}>No hay cargas de asistencia pendientes de aprobación.</p>
          ) : (
            <ul className={styles.pendingList}>
              {pendingApprovals.map((p) => (
                <li key={p.carga_id} className={styles.pendingCard}>
                  <div className={styles.pendingTop}>
                    <div>
                      <h2 className={styles.pendingTitle}>
                        {p.evento_titulo || `Evento: ${p.evento_id_externo}`}
                      </h2>
                      <span className={styles.hint}>
                        ID de carga externa: <code>{p.carga_id}</code>
                      </span>
                    </div>
                    <span className={styles.badgePending}>Requiere aprobación</span>
                  </div>

                  <div className={styles.pendingMeta}>
                    <div>
                      <strong>Nuevos registros:</strong> {p.registros_a_incorporar} socios
                    </div>
                    <div>
                      <strong>Origen:</strong> {p.origen === 'club' ? 'Push del club' : 'Archivo CSV'}
                    </div>
                    {p.carga_previa && (
                      <div>
                        <strong>Carga a reemplazar:</strong> {p.carga_previa.total_registros} socios ({p.carga_previa.carga_id})
                      </div>
                    )}
                  </div>

                  <div className={styles.pendingActions}>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      disabled={processingApprovalId === p.carga_id}
                      onClick={() => handleReject(p.carga_id)}
                    >
                      Rechazar reemplazo
                    </button>
                    <button
                      type="button"
                      className={styles.successButton}
                      disabled={processingApprovalId === p.carga_id}
                      onClick={() => handleApprove(p.carga_id)}
                    >
                      {processingApprovalId === p.carga_id ? 'Procesando…' : 'Aprobar y aplicar'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  )
}

export default AttendanceManagement
