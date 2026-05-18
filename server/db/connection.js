import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT || 3306),

      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,

      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  return pool;
}

export async function testConnection() {
  const connection = await getPool().getConnection();

  try {
    const [rows] = await connection.query("SELECT 1 AS connected");
    return rows;
  } finally {
    connection.release();
  }
}
