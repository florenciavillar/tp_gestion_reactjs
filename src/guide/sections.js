// Índice de cada manual: orden, título y bajada de las secciones, con el componente que las llena.
import * as admin from './adminGuide.jsx'
import * as member from './memberGuide.jsx'

export const memberSections = [
  {
    id: 'primeros-pasos',
    icon: 'start',
    title: 'Primeros pasos',
    teaser: 'Activar tu cuenta, ingresar con código y cómo funciona la sesión.',
    Body: member.FirstSteps,
  },
  {
    id: 'eventos',
    icon: 'calendar',
    title: 'Eventos y mi turno',
    teaser: 'Los próximos partidos y desde cuándo podés reservar tu entrada.',
    Body: member.EventsAndSlot,
  },
  {
    id: 'mi-puntaje',
    icon: 'trophy',
    title: 'Mi puntaje',
    teaser: 'Tu puntaje, tu puesto y por qué puede decir "Provisional".',
    Body: member.MyScore,
  },
  {
    id: 'desglose',
    icon: 'list',
    title: 'Desglose y cómo se calcula',
    teaser: 'De dónde sale cada punto.',
    Body: member.Breakdown,
  },
  {
    id: 'simulador',
    icon: 'chart',
    title: 'Simulador',
    teaser: 'Cuánto cambia tu puntaje si vas o no a un evento.',
    Body: member.Simulator,
  },
  {
    id: 'ejemplo',
    icon: 'route',
    title: 'Ejemplo: de un partido nuevo a tu entrada',
    teaser: 'El recorrido completo, paso a paso.',
    Body: member.Journey,
  },
  {
    id: 'glosario',
    icon: 'book',
    title: 'Glosario',
    teaser: 'Las palabras que usa la app, en criollo.',
    Body: member.MemberGlossary,
  },
  {
    id: 'errores',
    icon: 'alert',
    title: 'Si ves un mensaje de error',
    teaser: 'Qué significa cada aviso y qué hacer.',
    Body: member.MemberErrors,
  },
  {
    id: 'contacto',
    icon: 'mail',
    title: 'Contacto del club',
    teaser: 'A quién escribirle si algo no funciona.',
    Body: member.ClubContact,
  },
]

export const adminSections = [
  {
    id: 'acceso',
    icon: 'start',
    title: 'Acceso y otros admins',
    teaser: 'Ingresar con código e invitar a otros admins.',
    Body: admin.Access,
  },
  {
    id: 'eventos',
    icon: 'calendar',
    title: 'Publicar eventos',
    teaser: 'Elegir la clase o los puntos y publicar a tiempo.',
    Body: admin.Events,
  },
  {
    id: 'asistencias',
    icon: 'clipboard',
    title: 'Cargar asistencias',
    teaser: 'CSV de eventos y actividades, reemplazos y rechazos.',
    Body: admin.Attendance,
  },
  {
    id: 'formula',
    icon: 'sliders',
    title: 'Fórmula',
    teaser: 'Publicar, ajustar y bloquear las reglas del puntaje.',
    Body: admin.Formula,
  },
  {
    id: 'ranking',
    icon: 'bars',
    title: 'Ranking',
    teaser: 'Calcular el orden de prioridad y qué significan las advertencias.',
    Body: admin.Ranking,
  },
  {
    id: 'oleadas',
    icon: 'waves',
    title: 'Oleadas y cronograma',
    teaser: 'Armar los turnos de reserva de cada partido.',
    Body: admin.Waves,
  },
  {
    id: 'simulacion',
    icon: 'chart',
    title: 'Simulación',
    teaser: 'Probar cambios de reglas y configurar el simulador de los socios.',
    Body: admin.Simulation,
  },
  {
    id: 'ejemplo',
    icon: 'route',
    title: 'Ejemplo: de un partido nuevo al turno de los socios',
    teaser: 'El recorrido completo, en orden.',
    Body: admin.Journey,
  },
  {
    id: 'glosario',
    icon: 'book',
    title: 'Glosario',
    teaser: 'Los términos de administración.',
    Body: admin.AdminGlossary,
  },
  {
    id: 'errores',
    icon: 'alert',
    title: 'Si ves un mensaje de error',
    teaser: 'Los avisos más comunes y qué hacer.',
    Body: admin.AdminErrors,
  },
]
