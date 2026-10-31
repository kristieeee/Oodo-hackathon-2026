import { useAuth } from '../context/AuthContext'

const roleCopy = { ADMIN: ['You’re holding the whole system.', 'Monitor the pulse of Brightloop—revenue, renewals and the people behind them.'], STAFF: ['Keep the rhythm moving.', 'Review customer activity and keep every billing moment on track.'], CUSTOMER: ['Your account, at a glance.', 'Everything you need to manage your Brightloop subscription is here.'] }

function PortalHome({ view }) {
  const { user } = useAuth(); const [headline, copy] = roleCopy[user?.role] || roleCopy.CUSTOMER; const title = view || 'Overview'
  return <div className="portal-content"><header className="topbar"><div><p className="eyebrow">{title}</p><h1>{view ? `${view} workspace` : headline}</h1></div><div className="today">● LIVE <span>31 OCT 2026</span></div></header>
    {view ? <section className="empty-state"><span>⌁</span><h2>{title} is ready for its workflow.</h2><p>This protected area is tailored to your {user?.role?.toLowerCase()} access.</p></section> : <><p className="dashboard-copy">{copy}</p><section className="metric-grid"><article><p>ACTIVE SUBSCRIPTIONS</p><strong>{user?.role === 'CUSTOMER' ? '01' : '—'}</strong><span>Current billing relationships</span></article><article><p>THIS MONTH</p><strong>—</strong><span>Revenue reporting begins here</span></article><article><p>OPEN INVOICES</p><strong>—</strong><span>Nothing needs your attention</span></article></section><section className="welcome-note"><div className="note-seal">✦</div><div><p className="eyebrow">A CLEARER WAY TO RECUR</p><h2>Your subscription operating system is ready.</h2><p>Start by exploring the workspace. Your live plans, invoices and account activity will gather here.</p></div></section></>}
  </div>
}
export default PortalHome
