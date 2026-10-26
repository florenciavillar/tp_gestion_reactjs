import { Navigate, Route, Routes } from 'react-router'
import AppLayout from './components/AppLayout.jsx'
import { useAuth } from './components/authContext.js'
import AdminInvitation from './pages/AdminInvitation.jsx'
import AdminSignIn from './pages/AdminSignIn.jsx'
import EventSlot from './pages/EventSlot.jsx'
import Home from './pages/Home.jsx'
import InviteAdmin from './pages/InviteAdmin.jsx'
import MemberSignIn from './pages/MemberSignIn.jsx'
import Profile from './pages/Profile.jsx'
import PublishEvent from './pages/PublishEvent.jsx'
import SignIn from './pages/SignIn.jsx'
import SignUp from './pages/SignUp.jsx'

function App() {
  return (
    <Routes>
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin/invite" element={<RequireAuth role="admin"><InviteAdmin /></RequireAuth>} />
        <Route path="/admin/events/:id/publish" element={<RequireAuth role="admin"><PublishEvent /></RequireAuth>} />
        <Route path="/member/events/:id/slot" element={<RequireAuth role="member"><EventSlot /></RequireAuth>} />
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

function RequireAuth({ role, children }) {
  const { user, loading, sessionExpired } = useAuth()
  if (loading) return null
  if (!user) {
    const state = sessionExpired ? { notice: 'Tu sesión venció. Volvé a ingresar.' } : undefined
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
