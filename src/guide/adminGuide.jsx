import { Link } from 'react-router'
import { ErrorTable, Glossary, Note, Steps } from './GuideParts.jsx'

export function Access() {
  return (
    <>
      <h3>Ingresar</h3>
      <p>
        En la pantalla de bienvenida tocá "Acceso admins", escribí tu email y tocá "Enviar código". Te llega un código
        de 6 dígitos que vence en 10 minutos. No hay contraseña.
      </p>
      <p>La sesión se cierra después de 30 minutos sin usar la app, y como máximo a las 12 horas.</p>
      <h3>Invitar a otro admin</h3>
      <Steps
        steps={[
          {
            title: 'Abrí el menú de tu cuenta (abajo a la izquierda) y elegí "Invitar admin".',
            detail: '',
          },
          {
            title: 'Completá nombre, email y la confirmación del email, y tocá "Enviar invitación".',
            detail: 'El nuevo admin queda en tu mismo club.',
          },
          {
            title: 'La persona abre el link del mail.',
            detail:
              'Con abrirlo, la cuenta queda activa y la lleva al ingreso de admins. El link vence a las 48 horas y sirve una sola vez.',
          },
        ]}
      />
    </>
  )
}

export function Events() {
  return (
    <>
      <p>
        Los eventos los manda el sistema del club. En <Link to="/events">Eventos</Link> ves los que falta publicar:
        hasta que los publicás, los socios no los ven.
      </p>
      <Steps
        steps={[
          { title: 'Tocá "Publicar" en el evento.', detail: '' },
          {
            title: 'Elegí la clase (si es un partido) o los puntos (si es institucional).',
            detail:
              'Clase A: demanda alta, factor 1,0. Clase B: regular, factor 1,3 (por defecto). Clase C: demanda baja, factor 1,8. Los puntos de un evento institucional van de 1 a 100 y los suma cada socio que asiste.',
          },
          {
            title: 'Tocá "Revisar y publicar" y confirmá con "Publicar".',
            detail: 'Una vez publicado no se puede cambiar la clase ni los puntos.',
          },
        ]}
      />
      <Note>
        Cada evento tiene un plazo de publicación: 24 horas desde que llega, y nunca menos de 48 horas antes del inicio.
        Con menos de 48 horas para el evento ya no se puede publicar a mano, así que conviene publicarlos apenas
        aparecen.
      </Note>
    </>
  )
}

export function Attendance() {
  return (
    <>
      <p>
        En <Link to="/admin/attendance">Cargar asistencias</Link> subís archivos CSV (UTF-8, hasta 100.000 filas). Tiene
        tres pestañas:
      </p>
      <h3>Asistencia a un evento</h3>
      <ul>
        <li>
          Elegí un evento que ya ocurrió y subí un CSV con la columna <code>dni</code>. Opcionales:{' '}
          <code>numero_socio</code> y <code>fecha_evento</code> (AAAA-MM-DD, tiene que coincidir con la del evento).
        </li>
        <li>
          Si el evento ya tenía asistencia, marcá "Confirmo que deseo reemplazar la asistencia previa de este evento".
          La anterior queda en el historial.
        </li>
      </ul>
      <h3>Actividades recurrentes</h3>
      <ul>
        <li>
          Deporte federado y subcomisiones. Columnas: <code>dni,tipo,fecha_desde,fecha_hasta</code>, con{' '}
          <code>tipo</code> igual a <code>deporte_federado</code> o <code>subcomision</code>.
        </li>
        <li>Si una actividad ya existe con la misma fecha de inicio, se actualiza.</li>
      </ul>
      <h3>Aprobaciones pendientes</h3>
      <p>
        Cuando el club manda una asistencia que reemplaza a otra ya cargada, queda acá hasta que la aprobás ("Aprobar y
        aplicar") o la rechazás ("Rechazar reemplazo"). Si la rechazás, la asistencia anterior queda como estaba.
      </p>
      <h3>Filas rechazadas</h3>
      <p>
        Si hasta el 5 % de las filas tiene problemas, se aplica el resto y podés tocar "Descargar CSV de rechazos" para
        ver el motivo de cada una, corregirlas y volver a subirlas. Si se rechaza más del 5 %, no se aplica nada.
      </p>
    </>
  )
}

export function Formula() {
  return (
    <>
      <p>
        En <Link to="/admin/formula">Fórmula</Link> definís cómo se calcula el puntaje. Sin una fórmula publicada no se
        puede calcular el ranking.
      </p>
      <ul>
        <li>
          <strong>Publicar</strong>: en "Catálogo de fórmulas", tocá "Configurar y publicar", revisá los parámetros y
          usá "Ver vista previa" para leer lo que van a ver los socios. Al confirmar, rige de inmediato.
        </li>
        <li>
          <strong>Ajustar</strong>: en la fórmula vigente, "Ajustar parámetros". Cada publicación o ajuste crea una
          nueva versión de reglas.
        </li>
        <li>
          <strong>Bloquear</strong>: impide publicar otra fórmula o ajustar parámetros (por ejemplo, durante la
          temporada). No cambia el ranking ni lo que ven los socios. Pide un motivo.
        </li>
        <li>Antes de tocar valores reales, probalos con "Simular un cambio" (ver "Simulación").</li>
      </ul>
      <Note>
        Las reglas nuevas rigen ya, pero el ranking no se recalcula solo: los socios las ven reflejadas en su puntaje
        recién cuando calculás el ranking de nuevo.
      </Note>
    </>
  )
}

export function Ranking() {
  return (
    <>
      <p>
        En <Link to="/admin/ranking">Ranking</Link> calculás el orden de prioridad de los socios con las reglas vigentes
        y los datos cargados hasta ese momento. El nuevo ranking reemplaza al anterior.
      </p>
      <ul>
        <li>
          Tocá "Calcular ranking". Antes, la app revisa si los datos están al día y te muestra advertencias si hace
          falta.
        </li>
        <li>
          Las advertencias no bloquean: podés tocar "Calcular igual". Avisan si el padrón tiene más de 24 horas, si la
          última asistencia cargada tiene más de 7 días o si hubo cargas después del último ranking.
        </li>
        <li>Si el cálculo falla, el ranking anterior sigue vigente.</li>
        <li>Solo entran los socios con la cuota al día.</li>
        <li>
          Debajo vas a ver los rankings por pilar: los 10 socios con más puntos en Asistencia, en Participación
          institucional y en Antigüedad y edad, del último ranking calculado. Mientras se calcula uno nuevo dicen
          "actualizando".
        </li>
        <li>
          En Ranking → <Link to="/admin/ranking/executive-report">Reporte ejecutivo</Link> ves el resumen de puntajes y
          equidad del ranking vigente. Con "Generar documento" lo ves armado como documento, con una explicación de cada
          punto, y lo podés descargar en PDF.
        </li>
      </ul>
      <p>
        El padrón de socios lo manda el sistema del club. Si aparece la advertencia de padrón desactualizado, hay que
        pedirle al club que lo vuelva a enviar.
      </p>
    </>
  )
}

export function Waves() {
  return (
    <>
      <p>
        En <Link to="/admin/segmentation">Oleadas</Link> armás los turnos de reserva de cada partido: los socios se
        dividen en olas según su puesto (de a 20 % del ranking) y cada ola puede reservar desde un horario distinto.
      </p>
      <Steps
        steps={[
          {
            title: 'Generá las olas del partido.',
            detail:
              'Tocá "Generar olas". Se usa el último ranking calculado, y las olas quedan fijas aunque después recalcules el ranking.',
          },
          {
            title: 'Armá el cronograma.',
            detail:
              'Tocá "Armar cronograma" y completá "Apertura de la primera oleada" y "Cierre general". Las olas se reparten en partes iguales entre las dos, con al menos 5 minutos entre una y otra. El cierre no puede ser después del inicio del partido.',
          },
          {
            title: 'Confirmá el cronograma.',
            detail: 'Queda en borrador hasta que tocás "Confirmar cronograma". Recién ahí los socios ven su turno.',
          },
        ]}
      />
      <Note>
        Si regenerás las olas, el cronograma se invalida y hay que armarlo y confirmarlo de nuevo. Cuando abre la
        primera ola, ya no se pueden cambiar ni las olas ni el cronograma.
      </Note>
    </>
  )
}

export function Simulation() {
  return (
    <>
      <h3>Simular reglas</h3>
      <p>
        En <Link to="/admin/rules-simulation">Simulación → Simular Reglas</Link> probás otros valores de la fórmula y
        ves cómo cambiaría el ranking: quiénes suben y bajan, la distribución de puntajes, el efecto de cada parámetro y
        un análisis de equidad por antigüedad, distancia y edad. No se guarda nada; podés descargar el resultado en CSV.
        Para hacerlo oficial, ajustá los parámetros en Fórmula.
      </p>
      <h3>Configuración Socios</h3>
      <p>
        En <Link to="/admin/simulator">Simulación → Configuración Socios</Link> decidís si los socios ven una posición
        estimada en su simulador de partidos, con qué nivel de confianza (80 % por defecto) y desde cuántos socios en el
        ranking se estima (100 por defecto). Apagarlo no cambia el ranking.
      </p>
    </>
  )
}

export function Journey() {
  return (
    <>
      <p>Así llega un partido desde el sistema del club hasta el turno de cada socio:</p>
      <Steps
        steps={[
          {
            title: 'Tené una fórmula publicada y la asistencia al día.',
            detail: 'Fórmula → "Configurar y publicar"; Cargar asistencias para los partidos ya jugados.',
          },
          {
            title: 'Publicá el partido.',
            detail: 'Eventos → "Publicar" → elegí la clase → "Publicar". Hacelo con más de 48 horas de anticipación.',
          },
          {
            title: 'Calculá el ranking.',
            detail: 'Ranking → "Calcular ranking". Esperá a que diga "Completado".',
          },
          {
            title: 'Generá las olas.',
            detail: 'Oleadas → el partido → "Generar olas".',
          },
          {
            title: 'Armá el cronograma.',
            detail: '"Armar cronograma" → apertura y cierre → "Generar cronograma". Queda en borrador.',
          },
          {
            title: 'Confirmalo.',
            detail:
              '"Confirmar cronograma" → "Confirmar". Desde ahora cada socio ve su turno en Eventos → "Ver mi turno".',
          },
          {
            title: 'Después del partido, cargá la asistencia.',
            detail: 'Cargar asistencias → "Asistencia a un evento". Va a contar en el próximo cálculo del ranking.',
          },
        ]}
      />
    </>
  )
}

export function AdminGlossary() {
  return (
    <Glossary
      terms={[
        {
          term: 'Clase de partido',
          definition:
            'A (factor 1,0), B (1,3) o C (1,8). Un factor mayor premia ir a los partidos de menor convocatoria.',
        },
        {
          term: 'Versión de reglas',
          definition:
            'Se crea una nueva cada vez que publicás o ajustás la fórmula. El ranking dice con qué versión se calculó; si es vieja, figura como "Desactualizado".',
        },
        {
          term: 'Fórmula bloqueada',
          definition: 'Nadie puede publicar otra ni ajustar parámetros hasta desbloquearla.',
        },
        {
          term: 'Advertencias antes de calcular',
          definition:
            'Chequeos de que los datos estén al día (padrón, asistencia, cargas nuevas). Son avisos: se puede calcular igual.',
        },
        {
          term: 'Ola (oleada)',
          definition:
            'Grupo de socios según su puesto en el ranking (por defecto, de a 20 %). La ola 1 son los mejores puestos y reserva primero.',
        },
        {
          term: 'Cronograma',
          definition:
            'Horarios en que se habilita cada ola. Borrador: los socios no lo ven. Confirmado: lo ven. Invalidado: se regeneraron las olas y hay que armarlo de nuevo.',
        },
        {
          term: 'Padrón',
          definition: 'La lista de socios del club con su cuota, antigüedad y datos. La manda el sistema del club.',
        },
        {
          term: 'Tolerancia del 5 %',
          definition: 'En un CSV, si más del 5 % de las filas tiene errores no se aplica nada.',
        },
        {
          term: 'Reemplazo',
          definition:
            'Una carga de asistencia para un evento que ya tenía una. Se confirma con la casilla (CSV) o en "Aprobaciones pendientes" (si la manda el club).',
        },
        {
          term: 'Equidad',
          definition:
            'Cuánto sube o baja en promedio un grupo de socios con un cambio de reglas, como % del ranking. Se marca desde 2 % y es fuerte desde 5 %.',
        },
      ]}
    />
  )
}

export function AdminErrors() {
  return (
    <ErrorTable
      caption="Mensajes frecuentes para admins"
      rows={[
        {
          message: 'No pudimos mandar un código a ese email.',
          cause: 'El email no es de una cuenta de admin activa.',
          action: 'Revisalo. Si te invitaron, abrí primero el link de la invitación.',
        },
        {
          message: 'Este link venció. / Este link fue reemplazado…',
          cause: 'La invitación pasó las 48 horas o se mandó una más nueva.',
          action: 'Pedile a un admin que te invite de nuevo, o usá el último mail.',
        },
        {
          message: 'No se puede publicar manualmente el evento porque faltan menos de 48 horas…',
          cause: 'Se pasó el plazo de publicación manual.',
          action: 'Publicá los eventos apenas llegan.',
        },
        {
          message: 'Este evento ya fue publicado y no se puede volver a publicar.',
          cause: 'Otro admin lo publicó mientras tanto.',
          action: 'Nada: ya está visible para los socios.',
        },
        {
          message: 'El archivo supera la tolerancia máxima de error del 5%… Nada fue aplicado.',
          cause: 'Demasiadas filas con errores.',
          action: 'Corregí el archivo (DNI vacíos, repetidos o de otro club) y subilo de nuevo.',
        },
        {
          message: "Falta la columna obligatoria 'dni'… / Faltan columnas obligatorias…",
          cause: 'La cabecera del CSV no tiene las columnas esperadas.',
          action: 'Revisá los nombres de las columnas en la primera fila.',
        },
        {
          message: 'El archivo debe estar codificado en UTF-8…',
          cause: 'El CSV se guardó con otra codificación.',
          action: 'En Excel: "Guardar como" → "CSV UTF-8".',
        },
        {
          message: 'La fecha en el archivo (…) no coincide con la fecha del evento seleccionado.',
          cause: 'La columna fecha_evento es de otro evento.',
          action: 'Elegí el evento correcto o corregí la fecha.',
        },
        {
          message: 'El club todavía no publicó la fórmula del puntaje…',
          cause: 'No hay reglas vigentes.',
          action: 'Publicá una fórmula desde Fórmula.',
        },
        {
          message: 'La fórmula está bloqueada…',
          cause: 'Alguien la bloqueó.',
          action: 'Desbloqueala en Fórmula (si corresponde) y volvé a intentar.',
        },
        {
          message: 'Las reglas del club cambiaron mientras mirabas esta pantalla.',
          cause: 'Otro admin publicó o ajustó la fórmula.',
          action: 'Tocá "Recargar la pantalla" y revisá los valores nuevos.',
        },
        {
          message: 'Todavía no hay un ranking calculado: calculalo antes de generar las olas.',
          cause: 'Las olas salen del ranking.',
          action: 'Calculá el ranking primero.',
        },
        {
          message: 'Entre oleadas tiene que haber al menos 5 minutos…',
          cause: 'El período entre apertura y cierre es muy corto para la cantidad de olas.',
          action: 'Adelantá la apertura o atrasá el cierre.',
        },
        {
          message: 'El cierre no puede ser posterior al inicio del partido.',
          cause: 'El cierre general es después del partido.',
          action: 'Poné un cierre anterior al inicio.',
        },
        {
          message: 'La primera ola ya abrió: no se pueden regenerar las olas.',
          cause: 'La reserva ya empezó.',
          action: 'No se puede cambiar. Para el próximo partido, revisá antes de confirmar.',
        },
        {
          message: 'Tu sesión venció. Volvé a ingresar.',
          cause: 'Pasaron 30 minutos sin uso o 12 horas desde que entraste.',
          action: 'Ingresá de nuevo con un código.',
        },
      ]}
    />
  )
}
