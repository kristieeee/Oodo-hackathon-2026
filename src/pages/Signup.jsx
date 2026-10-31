import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import AuthShell from './AuthShell'

function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '' }); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth(); const navigate = useNavigate(); const valid = form.password.length > 8 && /[A-Z]/.test(form.password) && /[a-z]/.test(form.password) && /[^A-Za-z0-9]/.test(form.password)
  async function handleSubmit(event) { event.preventDefault(); setError(''); setSubmitting(true); try { const result = await api('/api/auth/signup', { method: 'POST', body: JSON.stringify(form) }); login(result); navigate('/') } catch (requestError) { setError(requestError.message) } finally { setSubmitting(false) } }
  return <AuthShell eyebrow="START HERE" title="Open your customer portal" footer={<>Already have an account? <Link to="/login">Sign in</Link></>}><form onSubmit={handleSubmit} className="auth-form">
    <label>Your name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required autoComplete="name" /></label><label>Email address<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required autoComplete="email" /></label><label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required autoComplete="new-password" /></label>
    <div className={`password-rule ${valid ? 'is-valid' : ''}`}><span>{valid ? '✓' : '○'}</span> More than 8 characters, with uppercase, lowercase and a special character.</div>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'} <span>→</span></button>
  </form></AuthShell>
}
export default Signup
