import { Navigate, Route, Routes } from 'react-router'
import AppLayout from './components/AppLayout.jsx'
import { useAuth } from './components/authContext.js'
import AdminInvitation from './pages/AdminInvitation.jsx'
import AdminSignIn from './pages/AdminSignIn.jsx'
import Home from './pages/Home.jsx'
import InviteAdmin from './pages/InviteAdmin.jsx'
import MemberSignIn from './pages/MemberSignIn.jsx'
import Profile from './pages/Profile.jsx'
import SignIn from './pages/SignIn.jsx'
import SignUp from './pages/SignUp.jsx'

function App() {
  return (
    <Routes>
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin/invite" element={<RequireAuth role="admin"><InviteAdmin /></RequireAuth>} />
      </Route>
      <Route path="/sign-in" element={<GuestOnly><SignIn /></GuestOnly>} />
      <Route path="/sign-in/member" element={<GuestOnly><MemberSignIn /></GuestOnly>} />
      <Route path="/sign-in/admin" element={<GuestOnly><AdminSignIn /></GuestOnly>} />
      <Route path="/sign-up" element={<GuestOnly><SignUp /></GuestOnly>} />
      <Route path="/admin-invitation" element={<AdminInvitation />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// Mientras se recupera la sesión guardada no se muestra nada, para no saltar al login y volver.
// Con `role`, un usuario de otro rol vuelve a la home (el back igual rechaza sus pedidos).
function RequireAuth({ role, children }) {
  const { user, loading, sessionExpired } = useAuth()
  if (loading) return null
  if (!user) {
    const state = sessionExpired ? { notice: 'Your session has expired. Please log in again.' } : undefined
    return <Navigate to="/sign-in" replace state={state} />
  }
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/" replace /> : children
}

export default App
