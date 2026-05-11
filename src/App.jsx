import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Footer from './components/Footer'
import Home from './pages/Home'
import Login from './pages/Login'
import PendingApproval from './pages/PendingApproval'
import Buyers from './pages/Buyers'
import BuyBoxes from './pages/BuyBoxes'
import BuyBoxForm from './pages/BuyBoxForm'
import Sellers from './pages/Sellers'
import AdminDashboard from './pages/AdminDashboard'
import Profile from './pages/Profile'
import MemberContact from './pages/MemberContact'
import ResetPassword from './pages/ResetPassword'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <div className="app-shell">
          <main className="app-main">
          <Routes>
            {/* Public routes without Layout */}
            <Route path="/login" element={<Login />} />
            <Route path="/pending" element={<PendingApproval />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* All routes with Layout (navbar) */}
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route
                path="/buyers"
                element={
                  <ProtectedRoute>
                    <Buyers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buy-boxes"
                element={
                  <ProtectedRoute>
                    <BuyBoxes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buy-box/new"
                element={
                  <ProtectedRoute requireMember>
                    <BuyBoxForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buy-box/:id/edit"
                element={
                  <ProtectedRoute requireMember>
                    <BuyBoxForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sellers"
                element={
                  <ProtectedRoute requireMember>
                    <Sellers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/member/:profileId"
                element={
                  <ProtectedRoute>
                    <MemberContact />
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
            </Route>
          </Routes>
          </main>
          <Footer />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
