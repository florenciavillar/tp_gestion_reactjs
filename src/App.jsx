import { Navigate, Route, Routes } from 'react-router'
import AppLayout from './components/AppLayout.jsx'
import { useAuth } from './components/authContext.js'
import AdminEquityAnalysis from './pages/AdminEquityAnalysis.jsx'
import AdminInvitation from './pages/AdminInvitation.jsx'
import AdminSignIn from './pages/AdminSignIn.jsx'
import AttendanceManagement from './pages/AttendanceManagement.jsx'
import EventSlot from './pages/EventSlot.jsx'
import Events from './pages/Events.jsx'
import FormulaPublish from './pages/FormulaPublish.jsx'
import FormulaSettings from './pages/FormulaSettings.jsx'
import Home from './pages/Home.jsx'
import InviteAdmin from './pages/InviteAdmin.jsx'
import MemberSignIn from './pages/MemberSignIn.jsx'
import MyScore from './pages/MyScore.jsx'
import Profile from './pages/Profile.jsx'
import PublishEvent from './pages/PublishEvent.jsx'
import RankingExplanationPage from './pages/RankingExplanationPage.jsx'
import ScoreBreakdownPage from './pages/ScoreBreakdownPage.jsx'
import SignIn from './pages/SignIn.jsx'
import SimulationResult from './pages/SimulationResult.jsx'
import Simulator from './pages/Simulator.jsx'
import SimulatorSettings from './pages/SimulatorSettings.jsx'
import SignUp from './pages/SignUp.jsx'
import RankingRun from './pages/RankingRun.jsx'
import Segmentation from './pages/Segmentation.jsx'
import SegmentationDetail from './pages/SegmentationDetail.jsx'
import WaveSchedule from './pages/WaveSchedule.jsx'

function App() {
  return (
    <Routes>
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/profile" element={<Profile />} />
        <Route
          path="/admin/invite"
          element={
            <RequireAuth role="admin">
              <InviteAdmin />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/attendance"
          element={
            <RequireAuth role="admin">
              <AttendanceManagement />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/formula"
          element={
            <RequireAuth role="admin">
              <FormulaSettings />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/formula/:id/:version"
          element={
            <RequireAuth role="admin">
              <FormulaPublish />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/ranking"
          element={
            <RequireAuth role="admin">
              <RankingRun />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/segmentation"
          element={
            <RequireAuth role="admin">
              <Segmentation />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/segmentation/:id"
          element={
            <RequireAuth role="admin">
              <SegmentationDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/segmentation/:id/schedule"
          element={
            <RequireAuth role="admin">
              <WaveSchedule />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/simulator"
          element={
            <RequireAuth role="admin">
              <SimulatorSettings />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/equity-analysis"
          element={
            <RequireAuth role="admin">
              <AdminEquityAnalysis />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/events/:id/publish"
          element={
            <RequireAuth role="admin">
              <PublishEvent />
            </RequireAuth>
          }
        />
        <Route
          path="/ranking"
          element={
            <RequireAuth role="member">
              <MyScore />
            </RequireAuth>
          }
        />
        <Route
          path="/ranking/breakdown"
          element={
            <RequireAuth role="member">
              <ScoreBreakdownPage />
            </RequireAuth>
          }
        />
        <Route
          path="/ranking/explanation"
          element={
            <RequireAuth role="member">
              <RankingExplanationPage />
            </RequireAuth>
          }
        />
        <Route
          path="/ranking/simulator"
          element={
            <RequireAuth role="member">
              <Simulator />
            </RequireAuth>
          }
        />
        <Route
          path="/ranking/simulator/:id"
          element={
            <RequireAuth role="member">
              <SimulationResult />
            </RequireAuth>
          }
        />
        <Route
          path="/member/events/:id/slot"
          element={
            <RequireAuth role="member">
              <EventSlot />
            </RequireAuth>
          }
        />
      </Route>
      <Route
        path="/sign-in"
        element={
          <GuestOnly>
            <SignIn />
          </GuestOnly>
        }
      />
      <Route
        path="/sign-in/member"
        element={
          <GuestOnly>
            <MemberSignIn />
          </GuestOnly>
        }
      />
      <Route
        path="/sign-in/admin"
        element={
          <GuestOnly>
            <AdminSignIn />
          </GuestOnly>
        }
      />
      <Route
        path="/sign-up"
        element={
          <GuestOnly>
            <SignUp />
          </GuestOnly>
        }
      />
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
