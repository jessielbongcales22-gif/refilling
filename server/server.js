import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mysql from "mysql2/promise";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pool = null;

function requiredEnv(name) {
  if (!process.env[name]) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return process.env[name];
}

function getSslConfig() {
  if (process.env.DB_SSL !== "true") {
    return undefined;
  }

  if (process.env.DB_CA_CERT) {
    return {
      ca: process.env.DB_CA_CERT.replace(/\\n/g, "\n"),
      rejectUnauthorized: true
    };
  }

  return {
    rejectUnauthorized: false
  };
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: requiredEnv("DB_HOST"),
      port: Number(process.env.DB_PORT || 3306),
      user: requiredEnv("DB_USER"),
      password: requiredEnv("DB_PASSWORD"),
      database: requiredEnv("DB_NAME"),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: getSslConfig()
    });
  }

  return pool;
}

async function testConnection() {
  const db = getPool();
  const [rows] = await db.execute("SELECT 1 AS connected");
  return rows;
}

async function initDatabase() {
  const db = getPool();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      phone VARCHAR(30),
      address TEXT,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'staff', 'customer') DEFAULT 'customer',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS water_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      customer_name VARCHAR(150) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      address TEXT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      price_per_container DECIMAL(10,2) NOT NULL DEFAULT 30.00,
      total_amount DECIMAL(10,2) NOT NULL,
      status ENUM('pending', 'confirmed', 'delivered', 'cancelled') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      action VARCHAR(255) NOT NULL,
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await seedDemoUsers();

  console.log("Database tables ready.");
}

async function seedDemoUsers() {
  const db = getPool();

  const demoUsers = [
    {
      username: "admin",
      email: "admin@a.a",
      password: "admin123",
      role: "admin",
      phone: "09000000000",
      address: "Hinunangan, Southern Leyte"
    },
    {
      username: "admin_watermarket",
      email: "admin@watermarket.com",
      password: "admin123",
      role: "admin",
      phone: "09000000001",
      address: "Hinunangan, Southern Leyte"
    },
    {
      username: "staff1",
      email: "staff1@watermarket.com",
      password: "staff123",
      role: "staff",
      phone: "09000000002",
      address: "Hinunangan, Southern Leyte"
    }
  ];

  for (const user of demoUsers) {
    const [existing] = await db.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [user.email]
    );

    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash(user.password, 10);

      await db.execute(
        `
        INSERT INTO users 
        (username, email, phone, address, password_hash, role)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          user.username,
          user.email,
          user.phone,
          user.address,
          passwordHash,
          user.role
        ]
      );

      console.log(`Seeded demo user: ${user.email}`);
    }
  }
}

app.use(
  cors({
    origin: "*",
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", async (req, res) => {
  try {
    await testConnection();

    res.json({
      success: true,
      message: "Server and Aiven MySQL connected successfully"
    });
  } catch (error) {
    console.error("Health check error:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message
    });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { username, email, phone, address, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required"
      });
    }

    const db = getPool();

    const [existing] = await db.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const allowedRoles = ["admin", "staff", "customer"];
    const finalRole = allowedRoles.includes(role) ? role : "customer";

    const [result] = await db.execute(
      `
      INSERT INTO users 
      (username, email, phone, address, password_hash, role)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        username,
        email,
        phone || null,
        address || null,
        passwordHash,
        finalRole
      ]
    );

    await db.execute(
      "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
      [result.insertId, "REGISTER", `New ${finalRole} account created`]
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: result.insertId,
        username,
        email,
        phone,
        address,
        role: finalRole
      }
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      success: false,
      message: `Server error during registration: ${error.message}`
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const loginValue = email || username;

    if (!loginValue || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/username and password are required"
      });
    }

    const db = getPool();

    const [users] = await db.execute(
      "SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1",
      [loginValue, loginValue]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials"
      });
    }

    const user = users[0];

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials"
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || "water-market-secret-key",
      {
        expiresIn: "1d"
      }
    );

    await db.execute(
      "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
      [user.id, "LOGIN", "User logged in"]
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: `Server error during login: ${error.message}`
    });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const db = getPool();

    const [users] = await db.execute(`
      SELECT id, username, email, phone, address, role, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch users: ${error.message}`
    });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const {
      user_id,
      customer_name,
      phone,
      address,
      quantity,
      price_per_container
    } = req.body;

    if (!customer_name || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: "Customer name, phone, and address are required"
      });
    }

    const finalQuantity = Number(quantity || 1);
    const finalPrice = Number(price_per_container || 30);
    const totalAmount = finalQuantity * finalPrice;

    const db = getPool();

    const [result] = await db.execute(
      `
      INSERT INTO water_orders
      (user_id, customer_name, phone, address, quantity, price_per_container, total_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user_id || null,
        customer_name,
        phone,
        address,
        finalQuantity,
        finalPrice,
        totalAmount
      ]
    );

    await db.execute(
      "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
      [
        user_id || null,
        "CREATE_ORDER",
        `Order #${result.insertId} created`
      ]
    );

    res.status(201).json({
      success: true,
      message: "Order recorded successfully",
      order: {
        id: result.insertId,
        customer_name,
        phone,
        address,
        quantity: finalQuantity,
        price_per_container: finalPrice,
        total_amount: totalAmount,
        status: "pending"
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to record order: ${error.message}`
    });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const db = getPool();

    const [orders] = await db.execute(`
      SELECT 
        o.*,
        u.username,
        u.email
      FROM water_orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch orders: ${error.message}`
    });
  }
});

app.patch("/api/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = ["pending", "confirmed", "delivered", "cancelled"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status"
      });
    }

    const db = getPool();

    await db.execute("UPDATE water_orders SET status = ? WHERE id = ?", [
      status,
      id
    ]);

    res.json({
      success: true,
      message: "Order status updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to update order status: ${error.message}`
    });
  }
});

app.get("/api/logs", async (req, res) => {
  try {
    const db = getPool();

    const [logs] = await db.execute(`
      SELECT 
        l.*,
        u.username,
        u.email
      FROM activity_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch logs: ${error.message}`
    });
  }
});

const distPath = path.join(__dirname, "../dist");

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  app.get(/.*/, (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({
        success: false,
        message: "API route not found"
      });
    }

    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  console.warn("dist folder not found.");
}

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Server running on port ${PORT}`);

  try {
    await testConnection();
    console.log("Aiven MySQL connected successfully.");

    await initDatabase();
  } catch (error) {
    console.error("Database setup failed:", error.message);
    console.error("Server is still running, but login/register may fail.");
  }
});
