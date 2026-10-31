import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

function PaymentsPage() {
  const { token } = useAuth(); const [payments, setPayments] = useState([]); const [error, setError] = useState('')
  useEffect(() => { api('/api/payments', { token }).then((data) => setPayments(data.payments)).catch((requestError) => setError(requestError.message)) }, [])
  return <div className="management-page"><header className="topbar"><div><p className="eyebrow">CASH RECEIPTS</p><h1>Payments</h1></div></header>{error && <p className="form-error">{error}</p>}<div className="data-table-wrap"><table className="data-table"><thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Method</th><th>Amount</th><th>Note</th></tr></thead><tbody>{payments.length ? payments.map((payment) => <tr key={payment.id}><td>{payment.payment_date}</td><td>INV-{String(payment.invoice_id).padStart(4, '0')}</td><td>{payment.customer_name}</td><td>{payment.method}</td><td>₹{payment.amount.toFixed(2)}</td><td>{payment.note || '—'}</td></tr>) : <tr><td colSpan="6">No payments recorded yet.</td></tr>}</tbody></table></div></div>
}
export default PaymentsPage
