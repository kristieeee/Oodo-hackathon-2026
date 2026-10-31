import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ForgotPassword from './pages/ForgotPassword'
import Login from './pages/Login'
import PortalHome from './pages/PortalHome'
import Signup from './pages/Signup'
import './brightloop.css'

function BrightloopApp() {
  return <Routes><Route path="/login" element={<Login />} /><Route path="/signup" element={<Signup />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route element={<ProtectedRoute />}><Route element={<Layout />}><Route path="/" element={<PortalHome />} /><Route path="/subscriptions" element={<PortalHome view="Subscriptions" />} /><Route path="/invoices" element={<PortalHome view="Invoices" />} /><Route path="/customers" element={<PortalHome view="Customers" />} /><Route path="/catalog" element={<PortalHome view="Catalog" />} /><Route path="/billing" element={<PortalHome view="Billing" />} /><Route path="/team" element={<PortalHome view="Team" />} /><Route path="/settings" element={<PortalHome view="Settings" />} /></Route></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes>
}
export default BrightloopApp
