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

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error.' });
});

if (require.main === module) {
  app.listen(port, () => console.log(`Brightloop API listening on port ${port}`));
}

module.exports = { app, requireAuth, requireRole };
