require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const port = 4000;
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET must be set in server/.env');
}

app.use(cors());
app.use(express.json());

function createToken(user, expiresIn = '7d') {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn });
}

function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication is required.' });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function isValidPassword(password) {
  return typeof password === 'string'
    && password.length > 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

app.post('/api/auth/signup', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { name, password } = req.body;
    if (!email || typeof name !== 'string' || !name.trim() || !isValidPassword(password)) {
      return res.status(400).json({ error: 'Provide a name, email, and a password longer than 8 characters with uppercase, lowercase, and special characters.' });
    }
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const result = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)')
      .run(email, await bcrypt.hash(password, 12), name.trim(), 'CUSTOMER');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ user: publicUser(user), token: createToken(user) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !(await bcrypt.compare(req.body.password || '', user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    return res.json({ user: publicUser(user), token: createToken(user) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/forgot', (req, res) => {
  const email = normalizeEmail(req.body.email);
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (user) {
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, purpose: 'password-reset' },
      jwtSecret,
      { expiresIn: '15m' },
    );
    console.log(`Password reset link for ${user.email}: http://localhost:5173/reset?token=${token}`);
  }
  return res.json({ message: 'If the account exists, a password reset link has been generated.' });
});

app.post('/api/auth/reset', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !isValidPassword(password)) {
      return res.status(400).json({ error: 'Provide a valid reset token and a strong password.' });
    }
    const payload = jwt.verify(token, jwtSecret);
    if (payload.purpose !== 'password-reset') {
      return res.status(400).json({ error: 'Invalid reset token.' });
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
    if (!user) {
      return res.status(400).json({ error: 'Invalid reset token.' });
    }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await bcrypt.hash(password, 12), user.id);
    return res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }
    return next(error);
  }
});

app.post('/api/staff', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { name, password } = req.body;
    if (!email || typeof name !== 'string' || !name.trim() || !isValidPassword(password)) {
      return res.status(400).json({ error: 'Provide a name, email, and a strong password.' });
    }
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const result = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)')
      .run(email, await bcrypt.hash(password, 12), name.trim(), 'STAFF');
    const staff = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ user: publicUser(staff) });
  } catch (error) {
    return next(error);
  }
});

const catalogRead = [requireAuth, requireRole('ADMIN', 'STAFF')];
const adminOnly = [requireAuth, requireRole('ADMIN')];
const staffOrAdmin = [requireAuth, requireRole('ADMIN', 'STAFF')];

function asNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function asBoolean(value, fallback = 0) {
  if (value === undefined) return fallback;
  return value ? 1 : 0;
}

function notFound(res, resource) {
  return res.status(404).json({ error: `${resource} not found.` });
}

function replaceVariants(productId, variants = []) {
  db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(productId);
  const insert = db.prepare('INSERT INTO product_variants (product_id, attribute, value, extra_price) VALUES (?, ?, ?, ?)');
  for (const variant of variants) {
    const extraPrice = asNumber(variant.extra_price, 0);
    if (!variant.attribute || !variant.value || extraPrice === null) throw new Error('Each variant requires attribute, value, and a valid extra_price.');
    insert.run(productId, variant.attribute.trim(), variant.value.trim(), extraPrice);
  }
}

function productWithVariants(product) {
  if (!product) return null;
  return { ...product, variants: db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY id').all(product.id) };
}

app.get('/api/products', ...catalogRead, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY id DESC').all().map(productWithVariants);
  res.json({ products });
});

app.post('/api/products', ...adminOnly, (req, res, next) => {
  try {
    const { name, type, sales_price, cost_price, notes, variants } = req.body;
    const salesPrice = asNumber(sales_price); const costPrice = asNumber(cost_price, 0);
    if (!name?.trim() || !type?.trim() || salesPrice === null || salesPrice < 0 || costPrice === null || costPrice < 0) return res.status(400).json({ error: 'Name, type, and non-negative prices are required.' });
    const create = db.transaction(() => {
      const result = db.prepare('INSERT INTO products (name, type, sales_price, cost_price, notes, active) VALUES (?, ?, ?, ?, ?, ?)').run(name.trim(), type.trim(), salesPrice, costPrice, notes || null, asBoolean(req.body.active, 1));
      replaceVariants(result.lastInsertRowid, variants || []);
      return result.lastInsertRowid;
    });
    const id = create();
    return res.status(201).json({ product: productWithVariants(db.prepare('SELECT * FROM products WHERE id = ?').get(id)) });
  } catch (error) { return next(error); }
});

app.put('/api/products/:id', ...adminOnly, (req, res, next) => {
  try {
    const current = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!current) return notFound(res, 'Product');
    const data = { ...current, ...req.body }; const salesPrice = asNumber(data.sales_price); const costPrice = asNumber(data.cost_price);
    if (!data.name?.trim() || !data.type?.trim() || salesPrice === null || salesPrice < 0 || costPrice === null || costPrice < 0) return res.status(400).json({ error: 'Name, type, and non-negative prices are required.' });
    const update = db.transaction(() => {
      db.prepare('UPDATE products SET name=?, type=?, sales_price=?, cost_price=?, notes=?, active=? WHERE id=?').run(data.name.trim(), data.type.trim(), salesPrice, costPrice, data.notes || null, asBoolean(data.active, current.active), current.id);
      if (req.body.variants) replaceVariants(current.id, req.body.variants);
    });
    update(); return res.json({ product: productWithVariants(db.prepare('SELECT * FROM products WHERE id = ?').get(current.id)) });
  } catch (error) { return next(error); }
});

app.delete('/api/products/:id', ...adminOnly, (req, res) => {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  return result.changes ? res.status(204).end() : notFound(res, 'Product');
});

const planFields = ['name', 'price', 'billing_period', 'min_quantity', 'available_from', 'available_to', 'auto_close', 'closable', 'pausable', 'renewable'];
function savePlan(res, body, id) {
  const source = body; const price = asNumber(source.price); const minimum = asNumber(source.min_quantity, 1); const period = String(source.billing_period || '').toUpperCase();
  if (!source.name?.trim() || price === null || price < 0 || !['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(period) || !Number.isInteger(minimum) || minimum < 1) return res.status(400).json({ error: 'Provide a name, price, supported billing period, and minimum quantity.' });
  const values = [source.name.trim(), price, period, minimum, source.available_from || null, source.available_to || null, asBoolean(source.auto_close), asBoolean(source.closable, 1), asBoolean(source.pausable), asBoolean(source.renewable, 1)];
  if (id) db.prepare(`UPDATE plans SET ${planFields.map((field) => `${field}=?`).join(', ')} WHERE id=?`).run(...values, id);
  else id = db.prepare(`INSERT INTO plans (${planFields.join(', ')}) VALUES (${planFields.map(() => '?').join(', ')})`).run(...values).lastInsertRowid;
  return res.status(id ? 200 : 201).json({ plan: db.prepare('SELECT * FROM plans WHERE id = ?').get(id) });
}

app.get('/api/plans', ...catalogRead, (req, res) => res.json({ plans: db.prepare('SELECT * FROM plans ORDER BY id DESC').all() }));
app.post('/api/plans', ...adminOnly, (req, res) => savePlan(res, req.body));
app.put('/api/plans/:id', ...adminOnly, (req, res) => { const current = db.prepare('SELECT * FROM plans WHERE id=?').get(req.params.id); return current ? savePlan(res, { ...current, ...req.body }, current.id) : notFound(res, 'Plan'); });
app.delete('/api/plans/:id', ...adminOnly, (req, res) => { const result = db.prepare('DELETE FROM plans WHERE id=?').run(req.params.id); return result.changes ? res.status(204).end() : notFound(res, 'Plan'); });

function simpleCrud({ path, table, fields, validate }) {
  app.get(`/api/${path}`, ...catalogRead, (req, res) => res.json({ [path]: db.prepare(`SELECT * FROM ${table} ORDER BY id DESC`).all() }));
  app.post(`/api/${path}`, ...adminOnly, (req, res) => {
    const payload = validate(req.body); if (payload.error) return res.status(400).json(payload);
    const result = db.prepare(`INSERT INTO ${table} (${fields.join(',')}) VALUES (${fields.map(() => '?').join(',')})`).run(...fields.map((field) => payload[field]));
    return res.status(201).json({ [path.slice(0, -1)]: db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(result.lastInsertRowid) });
  });
  app.put(`/api/${path}/:id`, ...adminOnly, (req, res) => {
    const current = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(req.params.id); if (!current) return notFound(res, path.slice(0, -1));
    const payload = validate({ ...current, ...req.body }); if (payload.error) return res.status(400).json(payload);
    db.prepare(`UPDATE ${table} SET ${fields.map((field) => `${field}=?`).join(',')} WHERE id=?`).run(...fields.map((field) => payload[field]), current.id);
    return res.json({ [path.slice(0, -1)]: db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(current.id) });
  });
  app.delete(`/api/${path}/:id`, ...adminOnly, (req, res) => { const result = db.prepare(`DELETE FROM ${table} WHERE id=?`).run(req.params.id); return result.changes ? res.status(204).end() : notFound(res, path.slice(0, -1)); });
}

simpleCrud({ path: 'taxes', table: 'taxes', fields: ['name', 'rate', 'active'], validate: (body) => { const rate = asNumber(body.rate); return !body.name?.trim() || rate === null || rate < 0 ? { error: 'Name and non-negative rate are required.' } : { name: body.name.trim(), rate, active: asBoolean(body.active, 1) }; } });
simpleCrud({ path: 'discounts', table: 'discounts', fields: ['name', 'type', 'value', 'min_purchase', 'min_quantity', 'start_date', 'end_date', 'usage_limit', 'used_count', 'applies_to', 'product_id'], validate: (body) => {
  const value = asNumber(body.value); const type = String(body.type || '').toUpperCase(); const appliesTo = String(body.applies_to || '').toUpperCase(); const minQuantity = asNumber(body.min_quantity); const usageLimit = asNumber(body.usage_limit);
  if (!body.name?.trim() || value === null || value < 0 || !['FIXED', 'PERCENTAGE'].includes(type) || !['PRODUCT', 'SUBSCRIPTION'].includes(appliesTo) || (minQuantity !== null && (!Number.isInteger(minQuantity) || minQuantity < 1)) || (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 0))) return { error: 'Provide valid discount details.' };
  if (type === 'PERCENTAGE' && value > 100) return { error: 'Percentage discounts cannot exceed 100.' };
  return { name: body.name.trim(), type, value, min_purchase: asNumber(body.min_purchase), min_quantity: minQuantity, start_date: body.start_date || null, end_date: body.end_date || null, usage_limit: usageLimit, used_count: asNumber(body.used_count, 0), applies_to: appliesTo, product_id: appliesTo === 'PRODUCT' ? asNumber(body.product_id) : null };
} });

function replaceTemplateLines(templateId, lines = []) {
  db.prepare('DELETE FROM quotation_template_lines WHERE quotation_template_id=?').run(templateId);
  const insert = db.prepare('INSERT INTO quotation_template_lines (quotation_template_id, product_id, description, quantity, unit_price, tax_id) VALUES (?, ?, ?, ?, ?, ?)');
  for (const line of lines) {
    const quantity = asNumber(line.quantity); const unitPrice = asNumber(line.unit_price);
    if (!line.product_id || !Number.isInteger(quantity) || quantity < 1 || unitPrice === null || unitPrice < 0) throw new Error('Template lines require product, quantity, and unit price.');
    insert.run(templateId, line.product_id, line.description || null, quantity, unitPrice, line.tax_id || null);
  }
}
function templateWithLines(template) { return template && { ...template, lines: db.prepare('SELECT * FROM quotation_template_lines WHERE quotation_template_id=? ORDER BY id').all(template.id) }; }
app.get('/api/templates', ...catalogRead, (req, res) => res.json({ templates: db.prepare('SELECT * FROM quotation_templates ORDER BY id DESC').all().map(templateWithLines) }));
app.post('/api/templates', ...adminOnly, (req, res, next) => { try { const validity = asNumber(req.body.validity_days ?? req.body.valid_for_days); if (!req.body.name?.trim() || !Number.isInteger(validity) || validity < 1 || !req.body.plan_id) return res.status(400).json({ error: 'Name, plan, and validity_days are required.' }); const create = db.transaction(() => { const result = db.prepare('INSERT INTO quotation_templates (name, valid_for_days, notes, active, plan_id) VALUES (?, ?, ?, ?, ?)').run(req.body.name.trim(), validity, req.body.notes || null, asBoolean(req.body.active, 1), req.body.plan_id); replaceTemplateLines(result.lastInsertRowid, req.body.lines || []); return result.lastInsertRowid; }); const id = create(); return res.status(201).json({ template: templateWithLines(db.prepare('SELECT * FROM quotation_templates WHERE id=?').get(id)) }); } catch (error) { return next(error); } });
app.put('/api/templates/:id', ...adminOnly, (req, res, next) => { try { const current = db.prepare('SELECT * FROM quotation_templates WHERE id=?').get(req.params.id); if (!current) return notFound(res, 'Template'); const data = { ...current, ...req.body }; const validity = asNumber(data.validity_days ?? data.valid_for_days); if (!data.name?.trim() || !Number.isInteger(validity) || validity < 1 || !data.plan_id) return res.status(400).json({ error: 'Name, plan, and validity_days are required.' }); const update = db.transaction(() => { db.prepare('UPDATE quotation_templates SET name=?, valid_for_days=?, notes=?, active=?, plan_id=? WHERE id=?').run(data.name.trim(), validity, data.notes || null, asBoolean(data.active, current.active), data.plan_id, current.id); if (req.body.lines) replaceTemplateLines(current.id, req.body.lines); }); update(); return res.json({ template: templateWithLines(db.prepare('SELECT * FROM quotation_templates WHERE id=?').get(current.id)) }); } catch (error) { return next(error); } });
app.delete('/api/templates/:id', ...adminOnly, (req, res) => { const result = db.prepare('DELETE FROM quotation_templates WHERE id=?').run(req.params.id); return result.changes ? res.status(204).end() : notFound(res, 'Template'); });

const transitions = { DRAFT: 'QUOTATION', QUOTATION: 'CONFIRMED', CONFIRMED: 'ACTIVE', ACTIVE: 'CLOSED' };
function nextSubscriptionNumber() {
  const latest = db.prepare("SELECT number FROM subscriptions WHERE number LIKE 'SUB-%' ORDER BY id DESC LIMIT 1").get();
  const sequence = latest ? Number(latest.number.slice(4)) + 1 : 1;
  return `SUB-${String(sequence).padStart(4, '0')}`;
}
function createSubscriptionLines(subscriptionId, lines) {
  if (!Array.isArray(lines) || !lines.length) throw new Error('At least one subscription line is required.');
  const insert = db.prepare('INSERT INTO subscription_lines (subscription_id, product_id, product_variant_id, description, quantity, unit_price, tax_id, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const line of lines) {
    const product = db.prepare('SELECT * FROM products WHERE id=?').get(line.product_id);
    const quantity = asNumber(line.quantity); const givenPrice = asNumber(line.unit_price);
    if (!product || !Number.isInteger(quantity) || quantity < 1) throw new Error('Each line requires a valid product and positive quantity.');
    let variant = null;
    if (line.product_variant_id) {
      variant = db.prepare('SELECT * FROM product_variants WHERE id=? AND product_id=?').get(line.product_variant_id, product.id);
      if (!variant) throw new Error('The selected variant does not belong to its product.');
    }
    if (line.tax_id && !db.prepare('SELECT 1 FROM taxes WHERE id=?').get(line.tax_id)) throw new Error('A selected tax does not exist.');
    const unitPrice = givenPrice === null ? product.sales_price + (variant?.extra_price || 0) : givenPrice;
    if (unitPrice < 0) throw new Error('Unit price must be non-negative.');
    insert.run(subscriptionId, product.id, variant?.id || null, line.description || product.name, quantity, unitPrice, line.tax_id || null, quantity * unitPrice);
  }
}
function subscriptionWithLines(subscription) {
  if (!subscription) return null;
  const lines = db.prepare(`SELECT sl.*, p.name AS product_name, pv.attribute AS variant_attribute, pv.value AS variant_value, t.name AS tax_name, t.rate AS tax_rate
    FROM subscription_lines sl JOIN products p ON p.id=sl.product_id LEFT JOIN product_variants pv ON pv.id=sl.product_variant_id LEFT JOIN taxes t ON t.id=sl.tax_id WHERE sl.subscription_id=? ORDER BY sl.id`).all(subscription.id);
  return { ...subscription, lines, next_status: transitions[subscription.status] || null };
}
app.get('/api/subscriptions', requireAuth, (req, res) => {
  const condition = req.user.role === 'CUSTOMER' ? 'WHERE s.customer_id=?' : '';
  const params = req.user.role === 'CUSTOMER' ? [req.user.sub] : [];
  const subscriptions = db.prepare(`SELECT s.*, u.name AS customer_name, u.email AS customer_email, p.name AS plan_name FROM subscriptions s JOIN users u ON u.id=s.customer_id JOIN plans p ON p.id=s.plan_id ${condition} ORDER BY s.id DESC`).all(...params).map(subscriptionWithLines);
  return res.json({ subscriptions });
});
app.get('/api/customers', ...staffOrAdmin, (req, res) => {
  const customers = db.prepare("SELECT id, name, email FROM users WHERE role='CUSTOMER' ORDER BY name").all();
  return res.json({ customers });
});
app.post('/api/subscriptions', ...staffOrAdmin, (req, res, next) => {
  try {
    const { customer_id, plan_id, start_date, expiry_date, payment_terms, template_id } = req.body;
    const customer = db.prepare("SELECT * FROM users WHERE id=? AND role='CUSTOMER'").get(customer_id);
    const template = template_id ? db.prepare('SELECT * FROM quotation_templates WHERE id=?').get(template_id) : null;
    const targetPlan = plan_id || template?.plan_id;
    if (!customer || !targetPlan || !start_date) return res.status(400).json({ error: 'Customer, plan, and start_date are required.' });
    if (!db.prepare('SELECT 1 FROM plans WHERE id=?').get(targetPlan)) return res.status(400).json({ error: 'Selected plan does not exist.' });
    const create = db.transaction(() => {
      const result = db.prepare('INSERT INTO subscriptions (number, customer_id, plan_id, start_date, expiry_date, payment_terms, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(nextSubscriptionNumber(), customer.id, targetPlan, start_date, expiry_date || null, payment_terms || null, 'DRAFT');
      let lines = req.body.lines;
      if (template && (!lines || !lines.length)) lines = db.prepare('SELECT product_id, description, quantity, unit_price, tax_id FROM quotation_template_lines WHERE quotation_template_id=?').all(template.id);
      createSubscriptionLines(result.lastInsertRowid, lines);
      return result.lastInsertRowid;
    });
    const id = create();
    return res.status(201).json({ subscription: subscriptionWithLines(db.prepare(`SELECT s.*, u.name AS customer_name, u.email AS customer_email, p.name AS plan_name FROM subscriptions s JOIN users u ON u.id=s.customer_id JOIN plans p ON p.id=s.plan_id WHERE s.id=?`).get(id)) });
  } catch (error) { return next(error); }
});
app.post('/api/subscriptions/:id/transition', ...staffOrAdmin, (req, res) => {
  const subscription = db.prepare('SELECT * FROM subscriptions WHERE id=?').get(req.params.id);
  if (!subscription) return notFound(res, 'Subscription');
  const target = String(req.body.status || '').toUpperCase(); const expected = transitions[subscription.status];
  if (!expected || target !== expected) return res.status(400).json({ error: `Invalid status transition. ${subscription.status} can only move to ${expected || 'no further status'}.` });
  db.prepare('UPDATE subscriptions SET status=?, next_billing_date=? WHERE id=?').run(target, target === 'ACTIVE' ? subscription.start_date : subscription.next_billing_date, subscription.id);
  return res.json({ subscription: subscriptionWithLines(db.prepare(`SELECT s.*, u.name AS customer_name, u.email AS customer_email, p.name AS plan_name FROM subscriptions s JOIN users u ON u.id=s.customer_id JOIN plans p ON p.id=s.plan_id WHERE s.id=?`).get(subscription.id)) });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error.' });
});

if (require.main === module) {
  app.listen(port, () => console.log(`Brightloop API listening on port ${port}`));
}

module.exports = { app, requireAuth, requireRole };
