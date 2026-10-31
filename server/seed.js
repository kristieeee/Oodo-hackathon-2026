const bcrypt = require('bcryptjs');
const db = require('./db');

const seed = db.transaction(() => {
  const addUser = db.prepare(`
    INSERT OR IGNORE INTO users (email, password_hash, name, role)
    VALUES (?, ?, ?, ?)
  `);
  const passwordHash = bcrypt.hashSync('Admin@1234', 12);

  addUser.run('admin@brightloop.com', passwordHash, 'Brightloop Admin', 'ADMIN');
  addUser.run('staff@brightloop.com', passwordHash, 'Brightloop Staff', 'STAFF');
  addUser.run('customer@brightloop.com', passwordHash, 'Brightloop Customer', 'CUSTOMER');

  db.prepare('INSERT OR IGNORE INTO taxes (name, rate) VALUES (?, ?)').run('GST 18%', 18);
  db.prepare('INSERT OR IGNORE INTO taxes (name, rate) VALUES (?, ?)').run('GST 5%', 5);

  const product = db.prepare(`
    INSERT INTO products (name, type, sales_price, cost_price, notes)
    SELECT ?, ?, ?, ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = ?)
  `).run('Business Suite', 'SOFTWARE', 2500, 900, 'Core business subscription product', 'Business Suite');
  const productId = product.lastInsertRowid || db.prepare('SELECT id FROM products WHERE name = ?').get('Business Suite').id;

  db.prepare(`
    INSERT OR IGNORE INTO product_variants (product_id, attribute, value, extra_price)
    VALUES (?, ?, ?, ?)
  `).run(productId, 'Brand', 'Odoo', 560);

  db.prepare(`
    INSERT OR IGNORE INTO plans
      (name, price, billing_period, min_quantity, auto_close, closable, pausable, renewable)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('Business Suite Monthly', 2500, 'MONTHLY', 1, 0, 1, 1, 1);
});

seed();
console.log('Database seeded successfully.');
