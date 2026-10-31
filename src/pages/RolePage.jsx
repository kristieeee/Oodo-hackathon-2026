import { useAuth } from '../context/AuthContext'
import CustomerPortal from './CustomerPortal'
import InvoicesPage from './InvoicesPage'
import SubscriptionsPage from './SubscriptionsPage'

function RolePage({ page }) {
  const { user } = useAuth()
  if (user?.role === 'CUSTOMER') return <CustomerPortal view={page} />
  return page === 'subscriptions' ? <SubscriptionsPage /> : <InvoicesPage />
}
export default RolePage
