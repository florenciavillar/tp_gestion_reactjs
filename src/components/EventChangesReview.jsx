import { useEffect, useState } from 'react'
import {
  adjustEventClass,
  approveEventChange,
  getPendingEventChanges,
  getPendingEvents,
  getPublishedEvents,
  rejectEventChange,
  restoreEvent,
  withdrawEvent,
} from '../services/events.js'
import { formatEventDate, formatEventTime } from '../services/eventFormat.js'
import styles from './Events.module.css'

function extractErrorMessage(err, defaultMessage) {
  if (err?.reason) return err.reason
  if (err?.violations && err.violations.length > 0) {
    return err.violations.map((v) => v.message).join('. ')
  }
  if (Array.isArray(err?.detail)) {
    return err.detail.map((d) => d.msg || (typeof d === 'string' ? d : JSON.stringify(d))).join('. ')
  }
  if (typeof err?.detail === 'string') return err.detail
  if (err?.message && !err.message.includes('falló:')) return err.message
  return defaultMessage
}

export default function EventChangesReview() {
  const [changes, setChanges] = useState([])
  const [publishedEvents, setPublishedEvents] = useState([])
  const [pendingEvents, setPendingEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)

  // Estado para rechazo con motivo
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  // Estado para gestión de retiro / restauración / ajuste
  const [withdrawId, setWithdrawId] = useState('')
  const [withdrawReason, setWithdrawReason] = useState('')
  const [restoreId, setRestoreId] = useState('')
  const [adjustId, setAdjustId] = useState('')
  const [adjustClase, setAdjustClase] = useState('B')
  const [adjustPuntos, setAdjustPuntos] = useState(20)
  const [adjustType, setAdjustType] = useState('Partido')

  const refreshAll = () => {
    setLoading(true)
    Promise.allSettled([
      getPendingEventChanges(),
      getPublishedEvents(),
      getPendingEvents({ limit: 100, offset: 0 }),
    ]).then(([resChanges, resPublished, resPending]) => {
      if (resChanges.status === 'fulfilled') {
        setChanges(resChanges.value || [])
      } else {
        setError('No pudimos cargar las solicitudes de cambio.')
      }

      if (resPublished.status === 'fulfilled') {
        setPublishedEvents(resPublished.value || [])
      }

      if (resPending.status === 'fulfilled') {
        setPendingEvents(resPending.value?.items || [])
      }
      setLoading(false)
    })
  }

  useEffect(() => {
    let ignore = false
    Promise.allSettled([
      getPendingEventChanges(),
      getPublishedEvents(),
      getPendingEvents({ limit: 100, offset: 0 }),
    ]).then(([resChanges, resPublished, resPending]) => {
      if (ignore) return
      if (resChanges.status === 'fulfilled') {
        setChanges(resChanges.value || [])
      } else {
        setError('No pudimos cargar las solicitudes de cambio.')
      }

      if (resPublished.status === 'fulfilled') {
        setPublishedEvents(resPublished.value || [])
      }

      if (resPending.status === 'fulfilled') {
        setPendingEvents(resPending.value?.items || [])
      }
      setLoading(false)
    })
    return () => {
      ignore = true
    }
  }, [])

  const handleApprove = async (idCambio) => {
    setError(null)
    setNotice(null)
    try {
      const res = await approveEventChange(idCambio)
      let msg = 'Cambio aprobado y aplicado exitosamente.'
      if (res.advertencia_cronograma) {
        msg += ` Advertencia: ${res.advertencia_cronograma}`
      }
      setNotice(msg)
      refreshAll()
    } catch (err) {
      setError(extractErrorMessage(err, 'Error al aprobar el cambio.'))
    }
  }

  const handleRejectConfirm = async (idCambio) => {
    setError(null)
    setNotice(null)
    try {
      await rejectEventChange(idCambio, rejectReason)
      setNotice('Cambio rechazado correctamente.')
      setRejectingId(null)
      setRejectReason('')
      refreshAll()
    } catch (err) {
      setError(extractErrorMessage(err, 'Error al rechazar el cambio.'))
    }
  }

  const handleWithdraw = async (e) => {
    e.preventDefault()
    const target = withdrawId.trim()
    const reason = withdrawReason.trim()
    if (!target || !reason) {
      setError('Debes ingresar el nombre o ID del evento y el motivo obligatorio.')
      return
    }
    setError(null)
    setNotice(null)
    try {
      const res = await withdrawEvent(target, reason)
      setNotice(res?.mensaje || `Evento «${target}» retirado exitosamente.`)
      setWithdrawId('')
      setWithdrawReason('')
      refreshAll()
    } catch (err) {
      setError(extractErrorMessage(err, 'Error al retirar el evento.'))
    }
  }

  const handleRestore = async (e) => {
    e.preventDefault()
    const target = restoreId.trim()
    if (!target) {
      setError('Debes ingresar el nombre o ID del evento a restaurar.')
      return
    }
    setError(null)
    setNotice(null)
    try {
      const res = await restoreEvent(target)
      setNotice(res?.mensaje || `Evento «${target}» restaurado exitosamente.`)
      setRestoreId('')
      refreshAll()
    } catch (err) {
      setError(extractErrorMessage(err, 'Error al restaurar el evento.'))
    }
  }

  const handleAdjustClass = async (e) => {
    e.preventDefault()
    const target = adjustId.trim()
    if (!target) {
      setError('Debes ingresar el nombre o ID del evento reprogramado.')
      return
    }
    setError(null)
    setNotice(null)
    try {
      const payload = adjustType === 'Partido' ? { clase: adjustClase } : { puntos: Number(adjustPuntos) }
      const res = await adjustEventClass(target, payload)
      setNotice(res?.mensaje || `Clase/puntos ajustados exitosamente para el evento «${target}».`)
      setAdjustId('')
      refreshAll()
    } catch (err) {
      setError(
        extractErrorMessage(
          err,
          'Error al ajustar clase/puntos. Recuerda que la ventana es de 24 horas tras la aprobación de una reprogramación.'
        )
      )
    }
  }

  const activeEvents = publishedEvents.filter((e) => e.estado !== 'withdrawn' && e.estado !== 'retirado')
  const withdrawnEvents = publishedEvents.filter((e) => e.estado === 'withdrawn' || e.estado === 'retirado')

  // Eventos retirables: publicados activos y pendientes que no están descartados
  const withdrawableEvents = [
    ...activeEvents.map((e) => ({ ...e, origen: 'Publicado' })),
    ...pendingEvents
      .filter((p) => p.estado !== 'descartado')
      .map((p) => ({ ...p, origen: 'Pendiente' })),
  ]

  return (
    <section className={styles.section} style={{ marginTop: '3rem', marginBottom: '2.5rem' }}>
      <div className={styles.headerRow}>
        <div className={styles.headerText}>
          <h2 className={styles.heading}>Reprogramaciones y cambios del club</h2>
          <p className={styles.muted}>
            Revisión y aprobación de cambios de fecha, hora o sede enviados por los clubes sobre eventos ya publicados.
          </p>
        </div>
      </div>

      {notice && (
        <p className={styles.deadline} role="status" style={{ background: '#e6f4ea', color: '#137333', marginBottom: '1rem' }}>
          {notice}
        </p>
      )}

      {error && (
        <p className={styles.error} role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      {loading && <p className={styles.muted}>Cargando solicitudes de cambio…</p>}

      {!loading && changes.length === 0 && (
        <p className={styles.empty}>No hay solicitudes de reprogramación pendientes de revisión.</p>
      )}

      {!loading && changes.length > 0 && (
        <ul className={styles.list}>
          {changes.map((c) => (
            <li key={c.id_cambio} className={styles.card}>
              <div className={styles.cardTop}>
                <div>
                  <h3 className={styles.cardTitle}>{c.titulo}</h3>
                  <span className={styles.clubId}>ID Club: {c.id_externo || c.id_interno}</span>
                </div>
                <span className={styles.type}>{c.tipo}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                <div style={{ background: '#f8f9fa', padding: '0.5rem', borderRadius: '4px' }}>
                  <strong>Valores Actuales:</strong>
                  <div>Fecha: {formatEventDate(c.comparacion.fecha_hora_actual)}</div>
                  <div>Hora: {formatEventTime(c.comparacion.fecha_hora_actual)}</div>
                  <div>Lugar: {c.comparacion.lugar_actual}</div>
                </div>
                <div style={{ background: '#e8f0fe', padding: '0.5rem', borderRadius: '4px' }}>
                  <strong>Nuevos Valores (Club):</strong>
                  <div>
                    Fecha:{' '}
                    {c.comparacion.fecha_hora_nueva
                      ? formatEventDate(c.comparacion.fecha_hora_nueva)
                      : formatEventDate(c.comparacion.fecha_hora_actual)}
                  </div>
                  <div>
                    Hora:{' '}
                    {c.comparacion.fecha_hora_nueva
                      ? formatEventTime(c.comparacion.fecha_hora_nueva)
                      : formatEventTime(c.comparacion.fecha_hora_actual)}
                  </div>
                  <div>Lugar: {c.comparacion.lugar_nuevo || c.comparacion.lugar_actual}</div>
                </div>
              </div>

              {rejectingId === c.id_cambio ? (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor={`reason-${c.id_cambio}`} style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Motivo del rechazo (opcional):
                  </label>
                  <input
                    id={`reason-${c.id_cambio}`}
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ej: El estadio no está habilitado para la fecha"
                    style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={styles.primary}
                      style={{ background: 'var(--color-red, #d93025)', borderColor: 'var(--color-red, #d93025)' }}
                      onClick={() => handleRejectConfirm(c.id_cambio)}
                    >
                      Confirmar rechazo
                    </button>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => {
                        setRejectingId(null)
                        setRejectReason('')
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.cardBottom}>
                  <button type="button" className={styles.primary} onClick={() => handleApprove(c.id_cambio)}>
                    Aprobar reprogramación
                  </button>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => {
                      setRejectingId(c.id_cambio)
                      setRejectReason('')
                    }}
                  >
                    Rechazar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* DATALISTS PARA AUTOCOMPLETAR POR NOMBRE O ID */}
      <datalist id="withdrawable-events-list">
        {withdrawableEvents.map((ev) => (
          <option key={`tit-${ev.id_interno}`} value={ev.titulo}>
            {ev.titulo} ({ev.origen} · ID Club: {ev.id_externo})
          </option>
        ))}
        {withdrawableEvents.map((ev) => (
          <option key={`ext-${ev.id_interno}`} value={ev.id_externo}>
            {ev.id_externo} ({ev.titulo})
          </option>
        ))}
      </datalist>

      <datalist id="withdrawn-events-list">
        {withdrawnEvents.map((ev) => (
          <option key={`tit-${ev.id_interno}`} value={ev.titulo}>
            {ev.titulo} (Retirado · ID Club: {ev.id_externo})
          </option>
        ))}
        {withdrawnEvents.map((ev) => (
          <option key={`ext-${ev.id_interno}`} value={ev.id_externo}>
            {ev.id_externo} ({ev.titulo})
          </option>
        ))}
      </datalist>

      <datalist id="adjustable-events-list">
        {activeEvents.map((ev) => (
          <option key={`tit-${ev.id_interno}`} value={ev.titulo}>
            {ev.titulo} (ID Club: {ev.id_externo})
          </option>
        ))}
        {activeEvents.map((ev) => (
          <option key={`ext-${ev.id_interno}`} value={ev.id_externo}>
            {ev.id_externo} ({ev.titulo})
          </option>
        ))}
      </datalist>

      {/* SECCIÓN FIJA DE GESTIÓN: RETIRO, RESTAURACIÓN Y AJUSTE 24H */}
      <section
        style={{
          marginTop: '2rem',
          padding: '1.25rem',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
        }}
      >
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.15rem', fontWeight: 700 }}>
            Gestión de eventos: Retirar, Restaurar y Ajustar clase
          </h3>
          <p className={styles.muted} style={{ margin: 0, fontSize: '0.85rem' }}>
            Operá sobre eventos ingresando su nombre o ID. Permite retirar eventos (publicados o pendientes), restaurar retirados y
            ajustar clase/puntos dentro de las 24 horas posteriores a una reprogramación.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* RETIRO */}
          <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h4 style={{ margin: 0, color: 'var(--color-red-dark, #b00020)' }}>Retirar evento</h4>
            <p className={styles.muted} style={{ fontSize: '0.8rem', margin: 0 }}>
              Pasa a retirado o descartado, desaparece para socios y anula cronograma y segmentación.
            </p>
            <label htmlFor="withdraw-event-input" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Nombre o ID del evento:
            </label>
            <input
              id="withdraw-event-input"
              type="text"
              list="withdrawable-events-list"
              placeholder="Nombre o ID (ej: Superclásico)"
              value={withdrawId}
              onChange={(e) => setWithdrawId(e.target.value)}
              style={{ padding: '0.4rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}
              required
            />
            <label htmlFor="withdraw-reason-input" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Motivo obligatorio:
            </label>
            <textarea
              id="withdraw-reason-input"
              placeholder="Motivo obligatorio del retiro..."
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              rows={2}
              style={{ padding: '0.4rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}
              required
            />
            <button type="submit" className={styles.primary} style={{ background: '#d93025', borderColor: '#d93025', marginTop: '0.25rem' }}>
              Retirar evento
            </button>
          </form>

          {/* RESTAURAR */}
          <form onSubmit={handleRestore} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h4 style={{ margin: 0 }}>Restaurar evento</h4>
            <p className={styles.muted} style={{ fontSize: '0.8rem', margin: 0 }}>
              Vuelve al estado activo. Su cronograma de olas se mantiene anulado hasta generar uno nuevo.
            </p>
            <label htmlFor="restore-event-input" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Nombre o ID del evento retirado:
            </label>
            <input
              id="restore-event-input"
              type="text"
              list="withdrawn-events-list"
              placeholder="Nombre o ID del evento retirado"
              value={restoreId}
              onChange={(e) => setRestoreId(e.target.value)}
              style={{ padding: '0.4rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}
              required
            />
            <button type="submit" className={styles.secondary} style={{ marginTop: 'auto' }}>
              Restaurar evento
            </button>
          </form>

          {/* AJUSTE CLASE / PUNTOS 24H */}
          <form onSubmit={handleAdjustClass} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h4 style={{ margin: 0 }}>Ajustar clase o puntos (24h)</h4>
            <p className={styles.muted} style={{ fontSize: '0.8rem', margin: 0 }}>
              Válido solo dentro de las 24 horas posteriores a la aprobación de una reprogramación.
            </p>
            <label htmlFor="adjust-event-input" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Nombre o ID del evento reprogramado:
            </label>
            <input
              id="adjust-event-input"
              type="text"
              list="adjustable-events-list"
              placeholder="Nombre o ID del evento"
              value={adjustId}
              onChange={(e) => setAdjustId(e.target.value)}
              style={{ padding: '0.4rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}
              required
            />
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tipo y valor:</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                aria-label="Tipo de evento para ajuste"
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value)}
                style={{ padding: '0.4rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}
              >
                <option value="Partido">Partido</option>
                <option value="Institucional">Institucional</option>
              </select>
              {adjustType === 'Partido' ? (
                <select
                  aria-label="Clase del partido"
                  value={adjustClase}
                  onChange={(e) => setAdjustClase(e.target.value)}
                  style={{ padding: '0.4rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}
                >
                  <option value="A">Clase A</option>
                  <option value="B">Clase B</option>
                  <option value="C">Clase C</option>
                </select>
              ) : (
                <input
                  aria-label="Puntos del evento"
                  type="number"
                  min="1"
                  max="100"
                  value={adjustPuntos}
                  onChange={(e) => setAdjustPuntos(e.target.value)}
                  style={{ width: '80px', padding: '0.4rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}
                />
              )}
            </div>
            <button type="submit" className={styles.secondary} style={{ marginTop: 'auto' }}>
              Ajustar clase/puntos
            </button>
          </form>
        </div>
      </section>
    </section>
  )
}
