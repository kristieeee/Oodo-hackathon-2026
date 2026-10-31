import { useAuth } from '../context/AuthContext'
import CustomerPortal from './CustomerPortal'
import DashboardPage from './DashboardPage'

function HomePage() { const { user } = useAuth(); return user?.role === 'CUSTOMER' ? <CustomerPortal /> : <DashboardPage /> }
export default HomePage
