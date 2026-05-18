import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool = null;

export function getPool() {
  if (pool) return pool;

  const sslConfig = {};

  // Aiven requires SSL connection
  if (process.env.DB_SSL_CA && fs.existsSync(process.env.DB_SSL_CA)) {
    sslConfig.ssl = {
      ca: fs.readFileSync(process.env.DB_SSL_CA, 'utf8'),
      cert: process.env.DB_SSL_CERT && fs.existsSync(process.env.DB_SSL_CERT)
        ? fs.readFileSync(process.env.DB_SSL_CERT, 'utf8')
        : undefined,
      key: process.env.DB_SSL_KEY && fs.existsSync(process.env.DB_SSL_KEY)
        ? fs.readFileSync(process.env.DB_SSL_KEY, 'utf8')
        : undefined,
    };
  } else {
    // Fallback: use rejectUnauthorized: false for development
    // In production, always use proper SSL certs from Aiven
    sslConfig.ssl = {
      rejectUnauthorized: false,
    };
  }

  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '25060'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'water_market',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ...sslConfig,
  });

  return pool;
}

export async function testConnection() {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT 1 as test');
    console.log('✅ Successfully connected to Aiven MySQL database');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}
