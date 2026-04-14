import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import PendingApproval from './pages/PendingApproval'
import Buyers from './pages/Buyers'
import Sellers from './pages/Sellers'
import AdminDashboard from './pages/AdminDashboard'
import ResetPassword from './pages/ResetPassword'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pending" element={<PendingApproval />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/buyers"
            element={
              <ProtectedRoute>
                <Buyers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sellers"
            element={
              <ProtectedRoute>
                <Sellers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
