import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ForgotPassword from './pages/ForgotPassword'
import Login from './pages/Login'
import HomePage from './pages/HomePage'
import Signup from './pages/Signup'
import ManagementPage from './pages/ManagementPage'
import TemplatesPage from './pages/TemplatesPage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import InvoicesPage from './pages/InvoicesPage'
import PaymentsPage from './pages/PaymentsPage'
import RolePage from './pages/RolePage'
import './brightloop.css'
import './management.css'

function BrightloopApp() {
  return <Routes><Route path="/login" element={<Login />} /><Route path="/signup" element={<Signup />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route element={<ProtectedRoute />}><Route element={<Layout />}><Route path="/" element={<HomePage />} /><Route path="/subscriptions" element={<RolePage page="subscriptions" />} /><Route path="/products" element={<ManagementPage resource="products" />} /><Route path="/plans" element={<ManagementPage resource="plans" />} /><Route path="/taxes" element={<ManagementPage resource="taxes" />} /><Route path="/discounts" element={<ManagementPage resource="discounts" />} /><Route path="/templates" element={<TemplatesPage />} /><Route path="/invoices" element={<RolePage page="invoices" />} /><Route path="/payments" element={<PaymentsPage />} /><Route path="/customers" element={<HomePage />} /><Route path="/billing" element={<InvoicesPage />} /><Route path="/team" element={<HomePage />} /><Route path="/settings" element={<HomePage />} /></Route></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes>
}
export default BrightloopApp
