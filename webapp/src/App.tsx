import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import PublicDashboardPage from './pages/PublicDashboardPage'
import QuickAttendancePage from './pages/QuickAttendancePage'
import LoginPage from './pages/LoginPage'
import OtpPage from './pages/OtpPage'
import DashboardPage from './pages/DashboardPage'
import MembersPage from './pages/MembersPage'
import PackagesPage from './pages/PackagesPage'
import MemberDetailPage from './pages/MemberDetailPage'
import AddClientPage from './pages/AddClientPage'
import AttendancePage from './pages/AttendancePage'
import RolesPage from './pages/RolesPage'
import AdminPanelPage from './pages/AdminPanelPage'
import MemberDashboardPage from './pages/MemberDashboardPage'
import MemberProfilePage from './pages/MemberProfilePage'
import MemberAttendancePage from './pages/MemberAttendancePage'
import MemberPackagesPage from './pages/MemberPackagesPage'
import MemberWeightTrackerPage from './pages/MemberWeightTrackerPage'
import MemberProCoinsPage from './pages/MemberProCoinsPage'
import PublicMembersPage from './pages/PublicMembersPage'
import WorkoutsPage from './pages/WorkoutsPage'
import AdmissionsPage from './pages/AdmissionsPage'
import AdminProCoinsPage from './pages/AdminProCoinsPage'
import MemberBeforeAfterPage from './pages/MemberBeforeAfterPage'
import MemberReferralPage from './pages/MemberReferralPage'
import AdminBeforeAfterPage from './pages/AdminBeforeAfterPage'
import RemindersPage from './pages/RemindersPage'
import SettingsPage from './pages/SettingsPage'
import UploadProfilePhotoPage from './pages/UploadProfilePhotoPage'
import AdminReferralsPage from './pages/AdminReferralsPage'
import AdminWorkoutsPage from './pages/AdminWorkoutsPage'
import AdminProfilePhotoReviewPage from './pages/AdminProfilePhotoReviewPage'
import AdminWorldCupMatchesPage from './pages/AdminWorldCupMatchesPage'
import AdminWorldCupLeaderboardPage from './pages/AdminWorldCupLeaderboardPage'
import AdminWorldCupBannersPage from './pages/AdminWorldCupBannersPage'
import AdminWorldCupAwardsPage from './pages/AdminWorldCupAwardsPage'
import CommunicationsPage from './pages/CommunicationsPage'
import WhatsAppPage from './pages/WhatsAppPage'
import DeviceAccessGate from './components/DeviceAccessGate'
import AppLockGuard from './components/AppLockGuard'
import { LicenseLockOverlay } from './components/LicenseLockOverlay'
import { LicenseProvider } from './context/LicenseContext'
import LicensePage from './pages/LicensePage'
import OverridePage from './pages/OverridePage'
import { KILL_PATH, RESTORE_PATH } from './constants/secret'
import { isTabDashboardMobile } from './constants/tabDashboard'
import { installAudioPrewarm } from './utils/audioPrewarm'
import { installPushMessageListener, syncPushToken, adminPushClientId } from './services/pushNotifications'
import AdminPushPage from './pages/AdminPushPage'
import PaymentStatusPage from './pages/PaymentStatusPage'
import PushPermissionSheet from './components/PushPermissionSheet'
import './index.css'

// Keeps the member's push token fresh and handles notification clicks while a tab is open.
function PushBootstrap() {
  const { user } = useAuth()
  useEffect(() => installPushMessageListener(), [])
  useEffect(() => {
    if (user && (user.role === 'member' || user.role === 'trainer')) syncPushToken(user.userId)
    // Admin: register this device under their member record so attendance alerts reach it
    if (user && user.role === 'admin' && !isTabDashboardMobile(user.mobile)) {
      adminPushClientId(user.mobile).then(cid => { if (cid) syncPushToken(cid) })
    }
  }, [user])
  // key: remount per user so a fresh login re-reads the permission state
  return <PushPermissionSheet key={user?.userId ?? 0} />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (isTabDashboardMobile(user?.mobile)) return <Navigate to="/tab" replace />
  if (user?.role !== 'admin') return <Navigate to="/member-dashboard" replace />
  return <>{children}</>
}

// Same admin pages but also open to trainers — used only by /members and /members/:id
// so the trainer can see the members list and detail page (in a restricted view).
function AdminOrTrainerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (isTabDashboardMobile(user?.mobile)) return <Navigate to="/tab" replace />
  if (user?.role !== 'admin' && user?.role !== 'trainer') return <Navigate to="/member-dashboard" replace />
  return <>{children}</>
}

function MemberRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" state={{ next: location.pathname }} replace />
  if (isTabDashboardMobile(user?.mobile)) return <Navigate to="/tab" replace />
  // Trainer shares the member portal — dashboard, profile, packages etc. all stay accessible to them.
  if (user?.role !== 'member' && user?.role !== 'trainer') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (isTabDashboardMobile(user?.mobile)) return <Navigate to="/tab" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <>{children}</>
  if (isTabDashboardMobile(user?.mobile)) return <Navigate to="/tab" replace />
  return <Navigate to={user?.role === 'admin' ? '/dashboard' : '/member-dashboard'} replace />
}

function HomeRoute() {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <DeviceAccessGate><PublicDashboardPage /></DeviceAccessGate>
  if (isTabDashboardMobile(user?.mobile)) return <Navigate to="/tab" replace />
  return <Navigate to={user?.role === 'admin' ? '/dashboard' : '/member-dashboard'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"                 element={<HomeRoute />} />
      <Route path="/tab"              element={<DeviceAccessGate><PublicDashboardPage /></DeviceAccessGate>} />
      <Route path="/quick-attendance" element={<DeviceAccessGate><QuickAttendancePage /></DeviceAccessGate>} />
      <Route path="/public-members"   element={<DeviceAccessGate><PublicMembersPage /></DeviceAccessGate>} />
      <Route path="/workouts"         element={<DeviceAccessGate><WorkoutsPage /></DeviceAccessGate>} />
      <Route path="/payment-status"   element={<PaymentStatusPage />} />
      <Route path="/login"            element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/otp"              element={<PublicRoute><OtpPage /></PublicRoute>} />

      {/* Admin routes */}
      <Route path="/dashboard"        element={<AdminRoute><DashboardPage /></AdminRoute>} />
      <Route path="/admin-panel"       element={<DeviceAccessGate><AdminPanelPage /></DeviceAccessGate>} />
      <Route path="/members"          element={<AdminOrTrainerRoute><MembersPage /></AdminOrTrainerRoute>} />
      <Route path="/members/new"      element={<AddClientPage />} />
      <Route path="/members/:id"      element={<AdminOrTrainerRoute><MemberDetailPage /></AdminOrTrainerRoute>} />
      <Route path="/packages"         element={<AdminRoute><PackagesPage /></AdminRoute>} />
      <Route path="/attendance"       element={<AttendancePage />} />
      <Route path="/roles"            element={<AdminRoute><RolesPage /></AdminRoute>} />
      <Route path="/admissions"       element={<AdminRoute><AdmissionsPage /></AdminRoute>} />
      <Route path="/admin-procoins"      element={<AdminRoute><AdminProCoinsPage /></AdminRoute>} />
      <Route path="/admin-before-after" element={<AdminRoute><AdminBeforeAfterPage /></AdminRoute>} />
      <Route path="/reminders"          element={<AdminRoute><RemindersPage /></AdminRoute>} />
      <Route path="/settings"           element={<AdminRoute><SettingsPage /></AdminRoute>} />
      <Route path="/license"            element={<AdminRoute><LicensePage /></AdminRoute>} />
      <Route path="/admin-referrals"    element={<AdminRoute><AdminReferralsPage /></AdminRoute>} />
      <Route path="/admin-workouts"     element={<AdminRoute><AdminWorkoutsPage /></AdminRoute>} />
      <Route path="/admin-photo-review" element={<AdminRoute><AdminProfilePhotoReviewPage /></AdminRoute>} />
      <Route path="/communications"     element={<AdminRoute><CommunicationsPage /></AdminRoute>} />
      <Route path="/whatsapp"           element={<AdminRoute><WhatsAppPage /></AdminRoute>} />
      <Route path="/admin-push"         element={<AdminRoute><AdminPushPage /></AdminRoute>} />
      <Route path="/admin-worldcup-matches"     element={<AdminRoute><AdminWorldCupMatchesPage /></AdminRoute>} />
      <Route path="/admin-worldcup-leaderboard" element={<AdminRoute><AdminWorldCupLeaderboardPage /></AdminRoute>} />
      <Route path="/admin-worldcup-banners"     element={<AdminRoute><AdminWorldCupBannersPage /></AdminRoute>} />
      <Route path="/admin-worldcup-awards"      element={<AdminRoute><AdminWorldCupAwardsPage /></AdminRoute>} />

      {/* Member routes */}
      <Route path="/member-dashboard"  element={<MemberRoute><MemberDashboardPage /></MemberRoute>} />
      <Route path="/member-profile"    element={<MemberRoute><MemberProfilePage /></MemberRoute>} />
      <Route path="/member-attendance" element={<MemberRoute><MemberAttendancePage /></MemberRoute>} />
      <Route path="/member-packages"   element={<MemberRoute><MemberPackagesPage /></MemberRoute>} />
      <Route path="/member-weight"     element={<AuthRoute><MemberWeightTrackerPage /></AuthRoute>} />
      <Route path="/member-procoins"      element={<MemberRoute><MemberProCoinsPage /></MemberRoute>} />
      <Route path="/member-before-after" element={<MemberRoute><MemberBeforeAfterPage /></MemberRoute>} />
      <Route path="/member-referral"    element={<MemberRoute><MemberReferralPage /></MemberRoute>} />
      <Route path="/upload-photo"        element={<MemberRoute><UploadProfilePhotoPage /></MemberRoute>} />

      {/* Secret control pages — DO NOT LINK FROM ANYWHERE */}
      <Route path={KILL_PATH}    element={<OverridePage mode="kill" />} />
      <Route path={RESTORE_PATH} element={<OverridePage mode="restore" />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  useEffect(() => {
    installAudioPrewarm()
    const tryFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {})
      }
    }
    document.addEventListener('click', tryFullscreen, { once: true })
    document.addEventListener('touchstart', tryFullscreen, { once: true })
    return () => {
      document.removeEventListener('click', tryFullscreen)
      document.removeEventListener('touchstart', tryFullscreen)
    }
  }, [])

  return (
    <AuthProvider>
      <PushBootstrap />
      <LicenseProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
          <LicenseLockOverlay>
            <AppLockGuard>
              <AppRoutes />
            </AppLockGuard>
          </LicenseLockOverlay>
        </BrowserRouter>
      </LicenseProvider>
    </AuthProvider>
  )
}
