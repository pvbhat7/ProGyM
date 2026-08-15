import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import SignupPage from './pages/SignupPage'
import MatchesPage from './pages/MatchesPage'
import PredictionPage from './pages/PredictionPage'
import MyPicksPage from './pages/MyPicksPage'
import CoinsPage from './pages/CoinsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import TeamsPage from './pages/TeamsPage'
import ProfilePage from './pages/ProfilePage'
import AwardsPage from './pages/AwardsPage'
import ReferEarnPage from './pages/ReferEarnPage'
import KnockoutBonanzaPage from './pages/KnockoutBonanzaPage'
import KnockoutBonanzaLeaderboardPage from './pages/KnockoutBonanzaLeaderboardPage'
import CallListPage from './pages/CallListPage'
import { getSession } from './services/wcSession'
import { ToastHost } from './components/Toast'
import AwardsPredictionGate from './components/AwardsPredictionGate'
import PointsCorrectionNotice from './components/PointsCorrectionNotice'
import RequireFullAccess from './components/RequireFullAccess'

function RequireSession({ children }: { children: React.ReactNode }) {
  if (!getSession()) return <Navigate to="/signup" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter basename="/wc2026">
      <ToastHost />
      <AwardsPredictionGate />
      <PointsCorrectionNotice />
      <Routes>
        <Route path="/"            element={<LandingPage />} />
        <Route path="/signup"      element={<SignupPage />} />
        <Route path="/matches"     element={<RequireSession><RequireFullAccess><MatchesPage /></RequireFullAccess></RequireSession>} />
        <Route path="/match/:id"   element={<RequireSession><RequireFullAccess><PredictionPage /></RequireFullAccess></RequireSession>} />
        <Route path="/my-picks"    element={<RequireSession><RequireFullAccess><MyPicksPage /></RequireFullAccess></RequireSession>} />
        <Route path="/coins"       element={<RequireSession><CoinsPage /></RequireSession>} />
        <Route path="/profile"     element={<RequireSession><ProfilePage /></RequireSession>} />
        <Route path="/leaderboard" element={<RequireFullAccess><LeaderboardPage /></RequireFullAccess>} />
        <Route path="/teams"       element={<TeamsPage />} />
        <Route path="/awards"      element={<RequireSession><AwardsPage /></RequireSession>} />
        <Route path="/refer"       element={<RequireSession><ReferEarnPage /></RequireSession>} />
        <Route path="/knockout-bonanza"             element={<KnockoutBonanzaPage />} />
        <Route path="/knockout-bonanza/leaderboard" element={<KnockoutBonanzaLeaderboardPage />} />
        <Route path="/calls"                        element={<CallListPage />} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
