import { useState } from 'react'
import { Outlet } from 'react-router'

// HU-29: el formulario y la pantalla de resultado comparten la última simulación en memoria.
// No se guarda en ningún lado: al salir del simulador o recargar la página, se pierde.
// { id, result, values, formula, breakdown? }
function RulesSimulationFlow() {
  const [simulation, setSimulation] = useState(null)
  return <Outlet context={{ simulation, setSimulation }} />
}

export default RulesSimulationFlow
