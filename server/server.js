import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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

// ════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT * FROM products ORDER BY type, name');
    res.json(rows.map(p => ({
      id: p.id, name: p.name, type: p.type,
      price: Number(p.price), stock: p.stock,
      unit: p.unit, description: p.description, minStock: p.min_stock,
    })));
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/products', authenticateToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { name, type, price, stock, unit, description, minStock } = req.body;
    const id = 'p' + Date.now();
    await getPool().query(
      'INSERT INTO products (id, name, type, price, stock, unit, description, min_stock) VALUES (?,?,?,?,?,?,?,?)',
      [id, name, type, price, stock, unit, description, minStock]
    );
    res.status(201).json({ id, name, type, price, stock, unit, description, minStock });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/products/:id', authenticateToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { name, type, price, stock, unit, description, minStock } = req.body;
    await getPool().query(
      'UPDATE products SET name=?, type=?, price=?, stock=?, unit=?, description=?, min_stock=? WHERE id=?',
      [name, type, price, stock, unit, description, minStock, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/products/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await getPool().query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    let query  = 'SELECT * FROM orders ORDER BY created_at DESC';
    let params = [];
    if (req.user.role === 'customer') {
      query  = 'SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC';
      params = [req.user.id];
    }
    const [orders] = await getPool().query(query, params);

    const result = [];
    for (const o of orders) {
      const [items] = await getPool().query('SELECT * FROM order_items WHERE order_id = ?', [o.id]);
      result.push({
        id: o.id,
        customerId: o.customer_id,
        customerName: o.customer_name,
        items: items.map(i => ({
          productId:   i.product_id,
          productName: i.product_name,
          quantity:    i.quantity,
          price:       Number(i.price),
          subtotal:    Number(i.subtotal),
        })),
        totalAmount:     Number(o.total_amount),
        status:          o.status,
        paymentMethod:   o.payment_method,
        paymentStatus:   o.payment_status,
        orderType:       o.order_type || 'delivery',
        deliveryAddress: o.delivery_address,
        notes:           o.notes || '',
        createdAt:       o.created_at,
        updatedAt:       o.updated_at,
      });
    }
    res.json(result);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { items, totalAmount, paymentMethod, paymentStatus, orderType, deliveryAddress, notes, customerName, customerId, status } = req.body;
    const orderId = 'o' + Date.now();
    const now = new Date();

    // Walk-in orders can have a custom customer name/id (from staff/admin)
    const custId   = customerId || req.user.id;
    const custName = customerName || req.user.username;
    const orderStatus  = status || 'pending';
    const orderPayStat = paymentStatus || (paymentMethod === 'cash' ? 'pending' : 'paid');
    const type = orderType || 'delivery';

    await getPool().query(
      `INSERT INTO orders
        (id, customer_id, customer_name, total_amount, status, payment_method, payment_status, order_type, delivery_address, notes, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [orderId, custId, custName, totalAmount, orderStatus, paymentMethod, orderPayStat, type, deliveryAddress, notes || '', now, now]
    );

    for (const item of items) {
      await getPool().query(
        'INSERT INTO order_items (id, order_id, product_id, product_name, quantity, price, subtotal) VALUES (?,?,?,?,?,?,?)',
        [crypto.randomUUID(), orderId, item.productId, item.productName, item.quantity, item.price, item.subtotal]
      );
      await getPool().query('UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?', [item.quantity, item.productId]);
    }

    res.status(201).json({ id: orderId });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const fields = [];
    const values = [];
    if (status)        { fields.push('status = ?');         values.push(status); }
    if (paymentStatus) { fields.push('payment_status = ?'); values.push(paymentStatus); }
    fields.push('updated_at = ?');
    values.push(new Date());
    values.push(req.params.id);
    await getPool().query(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/orders/:id', authenticateToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    await getPool().query('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);
    await getPool().query('DELETE FROM orders WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete order error:', err);
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
// REPORTS
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/reports/summary', authenticateToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const pool = getPool();
    const [[{ total: totalSales }]]    = await pool.query("SELECT COALESCE(SUM(total_amount),0) as total FROM orders WHERE status='completed'");
    const [[{ total: todaySales }]]    = await pool.query("SELECT COALESCE(SUM(total_amount),0) as total FROM orders WHERE status='completed' AND DATE(created_at)=CURDATE()");
    const [[{ total: monthlySales }]]  = await pool.query("SELECT COALESCE(SUM(total_amount),0) as total FROM orders WHERE status='completed' AND MONTH(created_at)=MONTH(CURDATE()) AND YEAR(created_at)=YEAR(CURDATE())");
    const [[{ count: todayOrders }]]   = await pool.query("SELECT COUNT(*) as count FROM orders WHERE DATE(created_at)=CURDATE()");
    const [[{ count: pendingOrders }]] = await pool.query("SELECT COUNT(*) as count FROM orders WHERE status IN ('pending','processing')");
    const [[{ count: totalOrders }]]   = await pool.query("SELECT COUNT(*) as count FROM orders");
    const [[{ count: totalProducts }]] = await pool.query("SELECT COUNT(*) as count FROM products");

    res.json({ totalSales: Number(totalSales), todaySales: Number(todaySales), monthlySales: Number(monthlySales), todayOrders, pendingOrders, totalOrders, totalProducts });
  } catch (err) {
    console.error('Reports error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SERVE FRONTEND (production — Render serves everything from this server)
// ════════════════════════════════════════════════════════════════════════════

import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');

import fs from 'fs';
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
  console.log('📁 Serving frontend from /dist');
}

// ════════════════════════════════════════════════════════════════════════════
// START
// ════════════════════════════════════════════════════════════════════════════

async function startServer() {
  console.log('\n🚀 Water Market Backend Starting...');
  console.log(`   DB Host : ${process.env.DB_HOST}`);
  console.log(`   DB Port : ${process.env.DB_PORT}`);
  console.log(`   DB Name : ${process.env.DB_NAME}`);
  console.log(`   API Port: ${PORT}\n`);

  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Cannot connect to Aiven MySQL. Check your server/.env credentials.\n');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`✅ Server running  → http://localhost:${PORT}`);
    console.log(`✅ Health check    → http://localhost:${PORT}/api/health`);
    console.log(`✅ Login           → POST /api/auth/login`);
    console.log(`✅ Register        → POST /api/auth/register`);
    console.log(`✅ Products        → GET  /api/products`);
    console.log(`✅ Orders          → GET  /api/orders`);
    console.log(`\n🎉 Ready!\n`);
  });
}

startServer();
