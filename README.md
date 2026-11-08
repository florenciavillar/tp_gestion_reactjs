# TP Gestión — Frontend

Frontend web en **React** + **Vite**, conectado al backend de Python (`GDSI2026c2`).

## Requisitos

- Node.js 22 (ver `.nvmrc`). Con nvm: `nvm use`
- npm

## Cómo levantarlo

```bash
nvm use
npm install
npm run dev
```

Abrir http://localhost:5173

## Scripts

| Comando           | Qué hace                                  |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Servidor de desarrollo con hot reload     |
| `npm run build`   | Build de producción en `dist/`            |
| `npm run preview` | Sirve el build de producción localmente   |
| `npm run lint`    | Linter (oxlint)                           |

## Estructura

```
src/
  main.jsx        # Punto de entrada, monta React en #root
  App.jsx         # Componente raíz
  pages/          # Páginas (Home, ...)
  components/     # Componentes reutilizables
  services/       # Llamadas al backend
  index.css       # Estilos globales
```

## Backend

En desarrollo, las requests a `/api/*` se redirigen a `http://localhost:8000` (configurado en `vite.config.js`).
Para apuntar a otra URL, copiar `.env.example` a `.env.local` y definir `VITE_API_URL`.
