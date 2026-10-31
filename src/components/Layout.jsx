import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const linksByRole = {
  ADMIN: [['Overview', '/', '◈'], ['Subscriptions', '/subscriptions', '⌁'], ['Products', '/products', '◇'], ['Plans', '/plans', '◐'], ['Taxes', '/taxes', '⊹'], ['Discounts', '/discounts', '٪'], ['Templates', '/templates', '▧'], ['Invoices', '/invoices', '▤'], ['Payments', '/payments', '₹'], ['Customers', '/customers', '◌'], ['Team', '/team', '♧'], ['Settings', '/settings', '⚙']],
  STAFF: [['Overview', '/', '◈'], ['Subscriptions', '/subscriptions', '⌁'], ['Products', '/products', '◇'], ['Plans', '/plans', '◐'], ['Taxes', '/taxes', '⊹'], ['Discounts', '/discounts', '٪'], ['Templates', '/templates', '▧'], ['Invoices', '/invoices', '▤'], ['Payments', '/payments', '₹'], ['Customers', '/customers', '◌']],
  CUSTOMER: [['My overview', '/', '◈'], ['My subscriptions', '/subscriptions', '⌁'], ['My invoices', '/invoices', '▤']],
}

function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  function handleLogout() { logout(); navigate('/login') }
  return <main className="portal-shell"><aside className="sidebar">
    <NavLink className="brand" to="/" aria-label="Brightloop home"><span className="brand-mark">B</span><span>bright<span>loop</span></span></NavLink>
    <div className="workspace-label">Workspace <span>⌄</span></div>
    <nav aria-label="Main navigation">{(linksByRole[user?.role] || []).map(([label, to, icon]) => <NavLink key={to} className="side-link" to={to} end={to === '/'}><span className="nav-symbol">{icon}</span>{label}</NavLink>)}</nav>
    <div className="sidebar-footer"><div className="profile-chip"><span>{user?.name?.slice(0, 1).toUpperCase()}</span><div><strong>{user?.name}</strong><small>{user?.role?.toLowerCase()}</small></div></div><button className="logout-button" type="button" onClick={handleLogout}>← Log out</button></div>
  </aside><section className="main-panel"><Outlet /></section></main>
}

export default Layout
