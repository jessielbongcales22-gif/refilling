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
});

async function reset() {
  console.log('\n🔴 Water Market — FULL DATABASE RESET');
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   DB  : ${process.env.DB_NAME}\n`);

  // Drop all tables in correct order (foreign keys)
  console.log('🗑️  Dropping all tables...');
  await pool.query('DROP TABLE IF EXISTS order_items');
  await pool.query('DROP TABLE IF EXISTS orders');
  await pool.query('DROP TABLE IF EXISTS products');
  await pool.query('DROP TABLE IF EXISTS users');
  console.log('✅ All tables dropped\n');

  // Recreate tables
  console.log('📦 Creating fresh tables...');

  await pool.query(`
    CREATE TABLE users (
      id            VARCHAR(36)  PRIMARY KEY,
      username      VARCHAR(100) NOT NULL UNIQUE,
      email         VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role          ENUM('admin','staff','customer') NOT NULL DEFAULT 'customer',
      phone         VARCHAR(20),
      address       TEXT,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('  ✅ users');

  await pool.query(`
    CREATE TABLE products (
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
  console.log('  ✅ products');

  await pool.query(`
    CREATE TABLE orders (
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
  console.log('  ✅ orders');

  await pool.query(`
    CREATE TABLE order_items (
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
  console.log('  ✅ order_items');

  // Seed only admin + staff + product
  console.log('\n🌱 Seeding default data...');

  const adminHash = await bcrypt.hash('admin123', 10);
  const staffHash = await bcrypt.hash('staff123', 10);

  await pool.query(
    'INSERT INTO users (id,username,email,password_hash,role,phone,address) VALUES (?,?,?,?,?,?,?)',
    ['u1','admin','admin@watermarket.com', adminHash,'admin','09171234567','Purok Saging, Brgy. Panalaron, Hinunangan, Southern Leyte']
  );
  console.log('  ✅ Admin  → admin@watermarket.com / admin123');

  await pool.query(
    'INSERT INTO users (id,username,email,password_hash,role,phone,address) VALUES (?,?,?,?,?,?,?)',
    ['u2','staff1','staff1@watermarket.com', staffHash,'staff','09181234567','Purok Saging, Brgy. Panalaron, Hinunangan, Southern Leyte']
  );
  console.log('  ✅ Staff  → staff1@watermarket.com / staff123');

  await pool.query(
    'INSERT INTO products (id,name,type,price,stock,unit,description,min_stock) VALUES (?,?,?,?,?,?,?,?)',
    ['p1','Purified Water','water',30.00,500,'container','Refill of purified water',50]
  );
  console.log('  ✅ Product → Purified Water ₱30 (500 stock)');

  console.log('\n🎉 Database reset complete! All records are empty except admin, staff, and product.\n');
  console.log('📋 Tables created:');
  console.log('   • users       (2 records: admin + staff)');
  console.log('   • products    (1 record: Purified Water)');
  console.log('   • orders      (0 records — empty)');
  console.log('   • order_items (0 records — empty)\n');

  await pool.end();
}

reset().catch(err => {
  console.error('\n❌ Reset failed:', err.message);
  process.exit(1);
});
