// Matchers del DOM (toBeInTheDocument, toHaveAttribute, …) y limpieza del render después de cada test.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
