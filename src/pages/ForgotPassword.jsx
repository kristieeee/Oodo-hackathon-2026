import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import AuthShell from './AuthShell'

function ForgotPassword() {
  const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false)
  async function handleSubmit(event) { event.preventDefault(); setError(''); setSubmitting(true); try { const result = await api('/api/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) }); setMessage(result.message) } catch (requestError) { setError(requestError.message) } finally { setSubmitting(false) } }
  return <AuthShell eyebrow="ACCOUNT RECOVERY" title="Reset your password" footer={<Link to="/login">← Back to sign in</Link>}><p className="form-intro">Enter the email tied to your account. We’ll send a secure reset link if it exists.</p><form onSubmit={handleSubmit} className="auth-form"><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}<button className="primary-button" disabled={submitting}>{submitting ? 'Sending…' : 'Send reset link'} <span>→</span></button></form></AuthShell>
}
export default ForgotPassword
