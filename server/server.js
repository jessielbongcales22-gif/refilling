import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getPool, testConnection } from './db/connection.js';
import paymentRoutes from './routes/payment.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Payment routes
app.use('/api/payment', paymentRoutes);

// ── JWT Middleware ──────────────────────────────────────────────────────────
function authenticateToken(req, res, next) {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

// ── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const ok = await testConnection();
  res.json({ status: ok ? 'connected' : 'disconnected', db: process.env.DB_NAME });
});

// ════════════════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════════════════

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await getPool().query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );
    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, phone: user.phone, address: user.address, createdAt: user.created_at },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, phone, address } = req.body;
    const [existing] = await getPool().query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existing.length) return res.status(400).json({ error: 'Email or username already exists' });

    const hash = await bcrypt.hash(password, 10);
    const id = 'u' + Date.now();
    await getPool().query(
      'INSERT INTO users (id, username, email, password_hash, role, phone, address) VALUES (?,?,?,?,?,?,?)',
      [id, username, email, hash, 'customer', phone, address]
    );
    const token = jwt.sign({ id, username, email, role: 'customer' }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
    res.status(201).json({ token, user: { id, username, email, role: 'customer', phone, address } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [users] = await getPool().query(
      'SELECT id, username, email, role, phone, address, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/:id/role', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await getPool().query('UPDATE users SET role = ? WHERE id = ?', [req.body.role, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await getPool().query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_id = ?)', [req.params.id]);
    await getPool().query('DELETE FROM orders WHERE customer_id = ?', [req.params.id]);
    await getPool().query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT * FROM products ORDER BY type, name');
    res.json(rows.map(p => ({
      id: p.id, name: p.name, type: p.type,
      price: Number(p.price), stock: p.stock,
      unit: p.unit, 
