import { createPool } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = createPool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '10894'),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'defaultdb',
  ssl:      { rejectUnauthorized: false },
  multipleStatements: true,
});

async function run() {
  console.log('\n🔧 Water Market — Database Setup');
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   DB  : ${process.env.DB_NAME}\n`);

  // ── Users ─────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id           VARCHAR(36)  PRIMARY KEY,
      username     VARCHAR(100) NOT NULL UNIQUE,
      email        VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role         ENUM('admin','staff','customer') NOT NULL DEFAULT 'customer',
      phone        VARCHAR(20),
      address      TEXT,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ users table ready');

  // ── Products ──────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id          VARCHAR(36)  PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      type        ENUM('water','container') NOT NULL,
      price       DECIMAL(10,2) NOT NULL DEFAULT 0,
      stock       INT           NOT NULL DEFAULT 0,
      unit        VARCHAR(50)   NOT NULL DEFAULT 'container',
      description TEXT,
      min_stock   INT           NOT NULL DEFAULT 10,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ products table ready');

  // ── Orders ────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id               VARCHAR(36)  PRIMARY KEY,
      customer_id      VARCHAR(36)  NOT NULL,
      customer_name    VARCHAR(100) NOT NULL,
      total_amount     DECIMAL(10,2) NOT NULL DEFAULT 0,
      status           ENUM('pending','processing','out-for-delivery','completed','cancelled') NOT NULL DEFAULT 'pending',
      payment_method   ENUM('cash','gcash') NOT NULL DEFAULT 'cash',
      payment_status   ENUM('pending','paid') NOT NULL DEFAULT 'pending',
      order_type       ENUM('delivery','walk-in') NOT NULL DEFAULT 'delivery',
      delivery_address TEXT NOT NULL,
      notes            TEXT,
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ orders table ready');

  // Add order_type column if upgrading existing table
  try {
    await pool.query(`ALTER TABLE orders ADD COLUMN order_type ENUM('delivery','walk-in') NOT NULL DEFAULT 'delivery' AFTER payment_status`);
    console.log('✅ Added order_type column to orders');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') console.log('   order_type column already exists');
  }

  // ── Order Items ───────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id           VARCHAR(36)   PRIMARY KEY,
      order_id     VARCHAR(36)   NOT NULL,
      product_id   VARCHAR(36)   NOT NULL,
      product_name VARCHAR(255)  NOT NULL,
      quantity     INT           NOT NULL DEFAULT 1,
      price        DECIMAL(10,2) NOT NULL,
      subtotal     DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ order_items table ready');

  // ── Seed Admin ────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 10);
  const staffHash = await bcrypt.hash('staff123', 10);

  try {
    await pool.query(
      'INSERT INTO users (id,username,email,password_hash,role,phone,address) VALUES (?,?,?,?,?,?,?)',
      ['u1','admin','admin@watermarket.com', adminHash,'admin','09171234567','123 Main St, Barangay 1']
    );
    console.log('✅ Admin seeded  → admin@watermarket.com / admin123');
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') console.log('ℹ️  Admin already exists');
    else console.error('❌ Admin seed error:', e.message);
  }

  try {
    await pool.query(
      'INSERT INTO users (id,username,email,password_hash,role,phone,address) VALUES (?,?,?,?,?,?,?)',
      ['u2','staff1','staff1@watermarket.com', staffHash,'staff','09181234567','456 Second St, Barangay 2']
    );
    console.log('✅ Staff seeded  → staff1@watermarket.com / staff123');
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') console.log('ℹ️  Staff already exists');
    else console.error('❌ Staff seed error:', e.message);
  }

  // ── Seed Product ──────────────────────────────────────────────────
  try {
    await pool.query(
      'INSERT INTO products (id,name,type,price,stock,unit,description,min_stock) VALUES (?,?,?,?,?,?,?,?)',
      ['p1','Purified Water','water',30.00,500,'container','Refill of purified water',50]
    );
    console.log('✅ Product seeded → Purified Water ₱30');
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') console.log('ℹ️  Product already exists');
    else console.error('❌ Product seed error:', e.message);
  }

  console.log('\n🎉 Database setup complete!\n');
  await pool.end();
}

run().catch(err => {
  console.error('\n❌ Setup failed:', err.message);
  process.exit(1);
});
