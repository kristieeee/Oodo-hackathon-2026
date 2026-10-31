import { Link } from 'react-router-dom'

function AuthShell({ eyebrow, title, children, footer }) {
  return <main className="auth-page"><section className="auth-aside">
    <Link className="brand auth-brand" to="/login"><span className="brand-mark">B</span><span>bright<span>loop</span></span></Link>
    <div className="aside-copy"><p className="eyebrow">SUBSCRIPTION OPERATIONS</p><h1>Make every renewal<br />feel inevitable.</h1><p>Brightloop brings customers, plans and payments into one clear rhythm.</p></div>
    <div className="orbit" aria-hidden="true"><i /><i /><b>∞</b></div><p className="aside-foot">BUILT FOR THE BUSINESS THAT REPEATS</p>
  </section><section className="auth-content"><div className="auth-card"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{children}{footer && <div className="form-footer">{footer}</div>}</div></section></main>
}
export default AuthShell
