import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ForgotPassword from './pages/ForgotPassword'
import Login from './pages/Login'
import PortalHome from './pages/PortalHome'
import Signup from './pages/Signup'
import ManagementPage from './pages/ManagementPage'
import TemplatesPage from './pages/TemplatesPage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import './brightloop.css'
import './management.css'

function BrightloopApp() {
  return <Routes><Route path="/login" element={<Login />} /><Route path="/signup" element={<Signup />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route element={<ProtectedRoute />}><Route element={<Layout />}><Route path="/" element={<PortalHome />} /><Route path="/subscriptions" element={<SubscriptionsPage />} /><Route path="/products" element={<ManagementPage resource="products" />} /><Route path="/plans" element={<ManagementPage resource="plans" />} /><Route path="/taxes" element={<ManagementPage resource="taxes" />} /><Route path="/discounts" element={<ManagementPage resource="discounts" />} /><Route path="/templates" element={<TemplatesPage />} /><Route path="/invoices" element={<PortalHome view="Invoices" />} /><Route path="/customers" element={<PortalHome view="Customers" />} /><Route path="/billing" element={<PortalHome view="Billing" />} /><Route path="/team" element={<PortalHome view="Team" />} /><Route path="/settings" element={<PortalHome view="Settings" />} /></Route></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes>
}
export default BrightloopApp
