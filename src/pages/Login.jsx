import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import AuthShell from './AuthShell'

function Login() {
  const [form, setForm] = useState({ email: '', password: '' }); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth(); const navigate = useNavigate(); const location = useLocation()
  async function handleSubmit(event) { event.preventDefault(); setError(''); setSubmitting(true); try { const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(form) }); login(result); navigate(location.state?.from?.pathname || '/') } catch (requestError) { setError(requestError.message) } finally { setSubmitting(false) } }
  return <AuthShell eyebrow="WELCOME BACK" title="Sign in to your workspace" footer={<>New to Brightloop? <Link to="/signup">Create an account</Link></>}><form onSubmit={handleSubmit} className="auth-form">
    <label>Email address<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required autoComplete="email" /></label>
    <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required autoComplete="current-password" /></label>
    <div className="form-row"><span /><Link to="/forgot-password">Forgot password?</Link></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'} <span>→</span></button>
  </form></AuthShell>
}
export default Login
