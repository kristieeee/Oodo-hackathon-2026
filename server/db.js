const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'data.db'));

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'STAFF', 'CUSTOMER')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    sales_price REAL NOT NULL DEFAULT 0 CHECK (sales_price >= 0),
    cost_price REAL NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attribute TEXT NOT NULL,
    value TEXT NOT NULL,
    extra_price REAL NOT NULL DEFAULT 0,
    UNIQUE (product_id, attribute, value)
  );

  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL CHECK (price >= 0),
    billing_period TEXT NOT NULL CHECK (billing_period IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
    min_quantity INTEGER NOT NULL DEFAULT 1 CHECK (min_quantity > 0),
    available_from TEXT,
    available_to TEXT,
    auto_close INTEGER NOT NULL DEFAULT 0 CHECK (auto_close IN (0, 1)),
    closable INTEGER NOT NULL DEFAULT 1 CHECK (closable IN (0, 1)),
    pausable INTEGER NOT NULL DEFAULT 0 CHECK (pausable IN (0, 1)),
    renewable INTEGER NOT NULL DEFAULT 1 CHECK (renewable IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS taxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    rate REAL NOT NULL CHECK (rate >= 0),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
  );

  CREATE TABLE IF NOT EXISTS discounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('FIXED', 'PERCENTAGE')),
    value REAL NOT NULL CHECK (value >= 0),
    min_purchase REAL,
    min_quantity INTEGER,
    start_date TEXT,
    end_date TEXT,
    usage_limit INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    applies_to TEXT NOT NULL CHECK (applies_to IN ('PRODUCT', 'SUBSCRIPTION')),
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    CHECK (usage_limit IS NULL OR usage_limit >= 0),
    CHECK (min_quantity IS NULL OR min_quantity > 0),
    CHECK ((applies_to = 'SUBSCRIPTION' AND product_id IS NULL) OR applies_to = 'PRODUCT')
  );

  CREATE TABLE IF NOT EXISTS quotation_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    valid_for_days INTEGER NOT NULL CHECK (valid_for_days > 0),
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quotation_template_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_template_id INTEGER NOT NULL REFERENCES quotation_templates(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price REAL NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    tax_id INTEGER REFERENCES taxes(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES users(id),
    plan_id INTEGER NOT NULL REFERENCES plans(id),
    start_date TEXT NOT NULL,
    expiry_date TEXT,
    payment_terms TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED', 'PAUSED')),
    next_billing_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subscription_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
    description TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    tax_id INTEGER REFERENCES taxes(id) ON DELETE SET NULL,
    amount REAL NOT NULL CHECK (amount >= 0)
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
    customer_id INTEGER NOT NULL REFERENCES users(id),
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CONFIRMED', 'SENT', 'PAID', 'CANCELLED')),
    subtotal REAL NOT NULL DEFAULT 0,
    tax_total REAL NOT NULL DEFAULT 0,
    discount_total REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    due_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (subscription_id, period_start)
  );

  CREATE TABLE IF NOT EXISTS invoice_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    tax_rate REAL NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
    tax_amount REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    amount REAL NOT NULL CHECK (amount >= 0)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id),
    method TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    payment_date TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
  CREATE INDEX IF NOT EXISTS idx_invoices_customer_status ON invoices(customer_id, status);
  CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
  CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_status_billing_customer ON subscriptions(status, next_billing_date, customer_id);
  CREATE INDEX IF NOT EXISTS idx_invoices_status_due_customer ON invoices(status, due_date, customer_id);
`);

const templateColumns = db.prepare("PRAGMA table_info(quotation_templates)").all();
if (!templateColumns.some((column) => column.name === 'plan_id')) {
  db.exec('ALTER TABLE quotation_templates ADD COLUMN plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL');
}

module.exports = db;
