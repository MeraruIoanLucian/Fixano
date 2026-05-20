import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

// Layouts
import DashboardLayout from './layouts/DashboardLayout'
import AppLayout from './layouts/AppLayout'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import PublicProfile from './pages/PublicProfile'
import CreateJobPage from './pages/CreateJob'
import NotFoundPage from './pages/NotFoundPage'
import HelpedJobs from './pages/HelpedJobs'
import JobDetails from './pages/JobDetails'
import Chat from './pages/Chat'
import ChatRoom from './pages/ChatRoom'
import Marketplace from './pages/Marketplace'
import StaticPage from './pages/StaticPage'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Pagini publice */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Dashboard - cu sidebar */}
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

          {/* Pagini autentificate - fara sidebar */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/create-job" element={<CreateJobPage />} />
            <Route path="/helped-jobs" element={<HelpedJobs />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:id" element={<PublicProfile />} />
            <Route path="/jobs/:id" element={<JobDetails />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:conversationId" element={<ChatRoom />} />
            <Route path="/page/:slug" element={<StaticPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
