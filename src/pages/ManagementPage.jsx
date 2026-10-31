import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

const configs = {
  products: { title: 'Products', singular: 'product', columns: ['name', 'type', 'sales_price'], fields: [['name', 'Name'], ['type', 'Type'], ['sales_price', 'Sales price', 'number'], ['cost_price', 'Cost price', 'number'], ['variant_attribute', 'Variant attribute'], ['variant_value', 'Variant value'], ['variant_extra_price', 'Variant extra price', 'number'], ['notes', 'Notes']], initial: { type: 'SOFTWARE', sales_price: 0, cost_price: 0, variant_extra_price: 0 } },
  plans: { title: 'Plans', singular: 'plan', columns: ['name', 'price', 'billing_period', 'min_quantity'], fields: [['name', 'Name'], ['price', 'Price', 'number'], ['billing_period', 'Billing period'], ['min_quantity', 'Minimum quantity', 'number'], ['available_from', 'Available from', 'date'], ['available_to', 'Available to', 'date']], initial: { billing_period: 'MONTHLY', min_quantity: 1 } },
  taxes: { title: 'Taxes', singular: 'tax', columns: ['name', 'rate'], fields: [['name', 'Name'], ['rate', 'Rate %', 'number']], initial: { rate: 0 } },
  discounts: { title: 'Discounts', singular: 'discount', columns: ['name', 'type', 'value', 'applies_to'], fields: [['name', 'Name'], ['type', 'Type'], ['value', 'Value', 'number'], ['min_purchase', 'Minimum purchase', 'number'], ['min_quantity', 'Minimum quantity', 'number'], ['start_date', 'Start date', 'date'], ['end_date', 'End date', 'date'], ['usage_limit', 'Usage limit', 'number'], ['applies_to', 'Applies to']], initial: { type: 'PERCENTAGE', applies_to: 'SUBSCRIPTION', value: 0 } },
}

function ManagementPage({ resource }) {
  const config = configs[resource]; const { token, user } = useAuth(); const [items, setItems] = useState([]); const [form, setForm] = useState(config.initial); const [editing, setEditing] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true)
  const isAdmin = user?.role === 'ADMIN'
  const load = async () => { setLoading(true); try { const data = await api(`/api/${resource}`, { token }); setItems(data[resource]) } catch (requestError) { setError(requestError.message) } finally { setLoading(false) } }
  useEffect(() => { load() }, [resource])
  const inputs = useMemo(() => config.fields, [config])
  async function submit(event) { event.preventDefault(); setError(''); try { const path = editing ? `/api/${resource}/${editing}` : `/api/${resource}`; const payload = resource === 'products' ? { ...form, variants: form.variant_attribute && form.variant_value ? [{ attribute: form.variant_attribute, value: form.variant_value, extra_price: form.variant_extra_price || 0 }] : [] } : form; await api(path, { token, method: editing ? 'PUT' : 'POST', body: JSON.stringify(payload) }); setForm(config.initial); setEditing(null); load() } catch (requestError) { setError(requestError.message) } }
  function edit(item) { const variant = item.variants?.[0]; setEditing(item.id); setForm({ ...item, variant_attribute: variant?.attribute || '', variant_value: variant?.value || '', variant_extra_price: variant?.extra_price || 0 }) }
  async function remove(id) { if (!window.confirm(`Delete this ${config.singular}?`)) return; try { await api(`/api/${resource}/${id}`, { token, method: 'DELETE' }); load() } catch (requestError) { setError(requestError.message) } }
  return <div className="management-page"><header className="topbar"><div><p className="eyebrow">CATALOG CONTROL</p><h1>{config.title}</h1></div>{!isAdmin && <p className="read-only">STAFF VIEW · READ ONLY</p>}</header>
    {isAdmin && <form className="management-form" onSubmit={submit}>{inputs.map(([key, label, type]) => <label key={key}>{label}<input type={type || 'text'} value={form[key] ?? ''} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required={['name', 'type', 'value', 'price', 'rate'].includes(key)} /></label>)}<button className="primary-button">{editing ? 'Save changes' : `Add ${config.singular}`} <span>→</span></button>{editing && <button type="button" className="quiet-button" onClick={() => { setEditing(null); setForm(config.initial) }}>Cancel</button>}</form>}
    {error && <p className="form-error" role="alert">{error}</p>}<div className="data-table-wrap"><table className="data-table"><thead><tr>{config.columns.map((column) => <th key={column}>{column.replaceAll('_', ' ')}</th>)}{isAdmin && <th>Actions</th>}</tr></thead><tbody>
      {loading && <tr><td colSpan="8">Loading…</td></tr>}
      {!loading && !items.length && <tr><td colSpan="8">No {resource} yet.</td></tr>}
      {!loading && items.map((item) => <tr key={item.id}>{config.columns.map((column) => <td key={column}>{column.includes('price') || column === 'value' ? `₹${item[column]}` : item[column]}</td>)}{isAdmin && <td><button type="button" className="table-button" onClick={() => edit(item)}>Edit</button><button type="button" className="table-button danger" onClick={() => remove(item.id)}>Delete</button></td>}</tr>)}
    </tbody></table></div></div>
}
export default ManagementPage
