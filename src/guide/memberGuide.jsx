import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getClubContact } from '../services/club.js'
import { ErrorTable, Glossary, Note, Steps } from './GuideParts.jsx'

export function FirstSteps() {
  return (
    <>
      <h3>Activar tu cuenta (una sola vez)</h3>
      <Steps
        steps={[
          {
            title: 'En la pantalla de bienvenida, tocá "Activá tu cuenta".',
            detail: 'Está debajo de los botones "Acceso socios" y "Acceso admins".',
          },
          {
            title: 'Ingresá tu DNI o tu número de socio y tocá "Activar".',
            detail: 'Podés escribirlo con puntos o espacios ("30.111.222"). Acá no se acepta el email.',
          },
          {
            title: 'Revisá tu mail.',
            detail:
              'Te llega un código de 6 dígitos al email que el club tiene registrado. Vence en 10 minutos y sirve una sola vez.',
          },
          { title: 'Escribí el código y tocá "Activar cuenta".', detail: 'Listo: ya podés ingresar.' },
        ]}
      />
      <h3>Ingresar</h3>
      <p>
        No hay contraseña. Cada vez que entrás, tocá "Acceso socios", escribí tu DNI, número de socio o email, tocá
        "Enviar código" y usá el código que te llega por mail.
      </p>
      <ul>
        <li>
          Si el código no llega, esperá 60 segundos y tocá "Reenviar código". Cada código nuevo anula el anterior.
        </li>
        <li>
          Si un número es a la vez el DNI de un socio y el número de socio de otro, la app te pregunta "Este número es
          mi…": elegí "DNI" o "Número de socio".
        </li>
      </ul>
      <h3>Tu sesión</h3>
      <p>
        La sesión se cierra sola después de 30 minutos sin usar la app, y como máximo a las 12 horas. Para volver a
        entrar vas a necesitar un código nuevo. Tus datos están en <Link to="/profile">Perfil</Link>, dentro del menú de
        tu cuenta, abajo a la izquierda.
      </p>
    </>
  )
}

export function EventsAndSlot() {
  return (
    <>
      <p>
        En <Link to="/events">Eventos</Link> están los próximos partidos y eventos del club, del más cercano al más
        lejano, con fecha, hora y lugar. Cada uno tiene dos botones: "Ver mi turno" y "Simular".
      </p>
      <h3>Mi turno</h3>
      <p>
        Para los partidos, el club habilita la reserva de entradas por turnos: los socios con mejor posición en el
        ranking pueden reservar antes. En "Mi turno" ves desde cuándo podés reservar vos, con una cuenta regresiva, y
        hasta cuándo.
      </p>
      <ul>
        <li>Cuando llega tu horario, la pantalla dice que tu acceso ya está habilitado.</li>
        <li>La compra se hace en la plataforma de entradas del club, no en Pasión de 10.</li>
        <li>
          Tu turno sale de tu posición en el ranking que se usó al armar los turnos de ese partido. Si después cambia tu
          puntaje, ese turno no cambia.
        </li>
        <li>Los eventos institucionales no tienen turnos de reserva.</li>
      </ul>
    </>
  )
}

export function MyScore() {
  return (
    <>
      <p>
        En <Link to="/ranking">Mi puntaje</Link> ves tu puntaje (de 0 a 100) y tu puesto en el ranking del club. Ese
        puesto define tu prioridad para comprar entradas.
      </p>
      <ul>
        <li>
          "Último ranking" es la fecha del último cálculo del club. El puntaje no cambia en vivo: se actualiza cada vez
          que el club calcula el ranking.
        </li>
        <li>
          Si ves "Provisional: todavía no calculado", todavía no tenés un puntaje calculado. Abajo aparece el motivo.
        </li>
        <li>
          El ranking solo incluye a los socios con la cuota al día. Si te atrasás, no perdés tu historial de asistencia
          y participación: vuelve a contar en el próximo cálculo después de regularizar.
        </li>
      </ul>
    </>
  )
}

export function Breakdown() {
  return (
    <>
      <p>
        En <Link to="/ranking#desglose">Mi puntaje</Link>, en la sección Desglose, ves de dónde sale cada punto de tu
        puntaje, componente por componente:
      </p>
      <ul>
        <li>
          <strong>Asistencia – frecuencia</strong>: partidos a los que fuiste sobre los evaluados, separados por clase
          de partido.
        </li>
        <li>
          <strong>Asistencia – distancia</strong>: suma más si vivís lejos del estadio.
        </li>
        <li>
          <strong>Participación institucional</strong>: elecciones, asambleas, eventos del club y actividades como
          deporte federado o subcomisiones.
        </li>
        <li>
          <strong>Antigüedad y edad</strong>: años de socio sin interrupciones y tu edad.
        </li>
        <li>
          <strong>Bonus nuevo socio</strong>: puntos extra los primeros 180 días desde el alta.
        </li>
        <li>
          <strong>Ajuste por tope</strong>: si la suma pasa de 100, se ajusta para que el total quede en 100.
        </li>
      </ul>
      <p>
        Si querés entender cómo pesa cada parte, la fórmula completa está explicada en{' '}
        <Link to="/ranking/explanation">Cómo se calcula</Link>, siempre con las reglas vigentes del club.
      </p>
    </>
  )
}

export function Simulator() {
  return (
    <>
      <p>
        En <Link to="/ranking/simulator">Simulador</Link> elegís un próximo evento y ves cómo cambiaría tu puntaje si
        vas y si no vas. No guarda nada ni te anota al evento.
      </p>
      <ul>
        <li>En los partidos también puede mostrarte una posición estimada, con un rango probable.</li>
        <li>
          Es una estimación: supone que cada socio va a los partidos según su historial y usa las reglas del último
          ranking. El resultado real puede cambiar en el próximo cálculo.
        </li>
        <li>Para simular necesitás estar en el último ranking calculado (con la cuota al día).</li>
      </ul>
    </>
  )
}

export function Journey() {
  return (
    <Steps
      steps={[
        {
          title: 'El club publica un partido.',
          detail: 'Aparece en Eventos, con fecha, hora y lugar.',
        },
        {
          title: 'Mirá cuánto te suma ir.',
          detail: 'Tocá "Simular" para ver cómo cambiaría tu puntaje si vas y si no vas.',
        },
        {
          title: 'Consultá tu turno.',
          detail:
            'Tocá "Ver mi turno". Si todavía dice que el cronograma no está definido, el club aún no armó los turnos: volvé a mirar más adelante.',
        },
        {
          title: 'Esperá tu horario.',
          detail: 'La cuenta regresiva te dice cuánto falta. Los socios mejor rankeados reservan primero.',
        },
        {
          title: 'Comprá en la plataforma de entradas del club.',
          detail:
            'Cuando "Mi turno" dice que tu acceso está habilitado, entrá a la plataforma del club y reservá tu lugar.',
        },
        {
          title: 'Después del partido, tu asistencia suma.',
          detail:
            'El club carga la asistencia y la incluye en el próximo cálculo del ranking. Ahí lo vas a ver en Mi puntaje y en Desglose.',
        },
      ]}
    />
  )
}

export function MemberGlossary() {
  return (
    <Glossary
      terms={[
        {
          term: 'Puntaje',
          definition:
            'Número de 0 a 100 que mide tu compromiso con el club. Define tu prioridad para comprar entradas.',
        },
        {
          term: 'Ranking y puesto',
          definition:
            'El orden de todos los socios con la cuota al día según su puntaje. Lo calcula el club cada tanto; tu puesto es tu lugar en ese orden.',
        },
        {
          term: 'Provisional',
          definition:
            'Todavía no tenés un puntaje calculado: no hay ranking, no estás incluido en el último o tenés cuotas pendientes.',
        },
        {
          term: 'Turno de reserva',
          definition:
            'El momento desde el que podés reservar entradas para un partido. Los socios con mejor puesto tienen turnos más tempranos.',
        },
        {
          term: 'Clase de partido (A, B, C)',
          definition:
            'Cuánta demanda tiene un partido. A son clásicos y finales; C, partidos de menor demanda. Ir a los partidos de menor demanda suma más.',
        },
        {
          term: 'Versión de reglas',
          definition:
            'El número de la fórmula con la que se calculó el ranking. Si el club cambia las reglas, se aplican desde el próximo cálculo.',
        },
        {
          term: 'Cuota al día',
          definition: 'Sin cuotas pendientes. Es necesario para activar la cuenta y para aparecer en el ranking.',
        },
      ]}
    />
  )
}

export function MemberErrors() {
  return (
    <>
      <h3>Al activar la cuenta o ingresar</h3>
      <ErrorTable
        caption="Mensajes al activar la cuenta o ingresar"
        rows={[
          {
            message: 'No podés activar tu cuenta porque tenés cuotas pendientes.',
            cause: 'El club te tiene con cuotas atrasadas.',
            action: 'Regularizá la cuota con el club y volvé a intentar.',
          },
          {
            message: 'El club no tiene un email tuyo registrado.',
            cause: 'No hay a dónde mandarte el código.',
            action: 'Pedile al club que cargue tu email.',
          },
          {
            message: 'No encontramos ese DNI o número de socio',
            cause: 'Ese número no está en el padrón del club.',
            action: 'Revisá que esté bien escrito. Si lo está, consultá con el club.',
          },
          {
            message: 'Tu cuenta todavía no está activada.',
            cause: 'Intentaste ingresar sin haber activado la cuenta.',
            action: 'La app te lleva a activarla: seguí los pasos de "Primeros pasos".',
          },
          {
            message: 'No pudimos mandar un código con esos datos.',
            cause: 'Los datos no coinciden con una cuenta.',
            action: 'Revisalos. Si nunca activaste la cuenta, activala primero.',
          },
          {
            message: 'Ese email es de más de un socio.',
            cause: 'Tu email lo comparte otro socio (por ejemplo, alguien de tu familia).',
            action: 'Ingresá con tu DNI o tu número de socio.',
          },
          {
            message: 'El código es incorrecto o venció.',
            cause: 'Lo escribiste mal, pasaron más de 10 minutos o pediste uno más nuevo.',
            action: 'Usá el último código que te llegó, o pedí uno nuevo.',
          },
          {
            message: 'Ya te mandamos un código. Podés pedir otro en…',
            cause: 'Pediste otro código hace menos de un minuto.',
            action: 'Revisá tu mail (y la carpeta de spam) y esperá el tiempo que indica.',
          },
          {
            message: 'Demasiados intentos fallidos.',
            cause: 'Escribiste mal el código 5 veces.',
            action: 'Esperá 15 minutos y pedí un código nuevo.',
          },
          {
            message: 'Tu sesión venció. Volvé a ingresar.',
            cause: 'Pasaron 30 minutos sin usar la app, o 12 horas desde que entraste.',
            action: 'Ingresá de nuevo con un código.',
          },
        ]}
      />
      <h3>Dentro de la app</h3>
      <ErrorTable
        caption="Mensajes dentro de la app"
        rows={[
          {
            message: 'Todavía no estás en el ranking: vas a aparecer después del próximo cálculo.',
            cause: 'Te sumaste o te pusiste al día después del último cálculo.',
            action: 'Nada: vas a aparecer cuando el club vuelva a calcular el ranking.',
          },
          {
            message: 'Para simular necesitás un puntaje calculado.',
            cause: 'No estás en el último ranking (por ejemplo, por cuotas pendientes).',
            action: 'Esperá al próximo cálculo, con la cuota al día.',
          },
          {
            message: 'El cronograma de reservas de este evento todavía no está definido.',
            cause: 'El club todavía no armó los turnos de ese partido.',
            action: 'Volvé a mirar más adelante.',
          },
          {
            message: 'No tenés un turno asignado para este evento.',
            cause: 'No estabas en el ranking que se usó para armar los turnos de ese partido.',
            action: 'Contactá al club (ver "Contacto del club").',
          },
          {
            message: 'Este evento ya no está disponible para simular.',
            cause: 'El evento ya empezó o cambió.',
            action: 'Elegí otro evento.',
          },
          {
            message: 'Tu cuenta no tiene un club asignado.',
            cause: 'Hay un problema con los datos de tu cuenta.',
            action: 'Contactá al club.',
          },
          {
            message: 'No pudimos cargar… Probá de nuevo en un rato.',
            cause: 'Falla momentánea de conexión.',
            action: 'Recargá la página. Si sigue, avisale al club.',
          },
        ]}
      />
    </>
  )
}

export function ClubContact({ viewerIsAdmin }) {
  const [state, setState] = useState({ status: viewerIsAdmin ? 'admin' : 'loading' })

  useEffect(() => {
    if (viewerIsAdmin) return
    let ignore = false
    getClubContact()
      .then((data) => !ignore && setState({ status: 'ready', data }))
      .catch(() => !ignore && setState({ status: 'error' }))
    return () => {
      ignore = true
    }
  }, [viewerIsAdmin])

  if (state.status === 'admin') {
    return (
      <Note>
        Acá el socio ve el nombre y el email del admin más antiguo de tu club, para escribirle si algo no funciona.
      </Note>
    )
  }
  if (state.status === 'loading') return <p role="status">Cargando el contacto…</p>
  if (state.status === 'error' || !state.data.admin) {
    return <p>Para cualquier consulta, comunicate con la administración de tu club.</p>
  }
  const { club, admin } = state.data
  return (
    <>
      <p>
        Si algo no funciona o tenés dudas con tu cuenta, tu cuota o tus puntos, escribile a la administración de {club}:
      </p>
      <p>
        <strong>{admin.name}</strong> — <a href={`mailto:${admin.email}`}>{admin.email}</a>
      </p>
    </>
  )
}
