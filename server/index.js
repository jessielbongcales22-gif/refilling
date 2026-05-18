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

console.log("✅ BOOTING server/index.js — CORRECT SERVER FILE");

const app = express();
const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl:
        process.env.DB_SSL === "true"
          ? {
              rejectUnauthorized: false
            }
          : undefined
    });
  }

  return pool;
}

async function testConnection() {
  const db = getPool();
  const [rows] = await db.execute("SELECT 1 AS connected");
  return rows;
}

async function safeExecute(sql) {
  try {
    const db = getPool();
    await db.execute(sql);
  } catch (error) {
    console.warn("Migration skipped:", error.message);
  }
}

async function initDatabase() {
  const db = getPool();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'staff', 'customer') DEFAULT 'customer',
      phone VARCHAR(30),
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS water_orders (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      customer_name VARCHAR(150) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      address TEXT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      price_per_container DECIMAL(10,2) NOT NULL DEFAULT 30.00,
      total_amount DECIMAL(10,2) NOT NULL,
      order_type ENUM('online', 'walk_in') DEFAULT 'online',
      status ENUM('pending', 'confirmed', 'delivered', 'cancelled', 'completed') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      category VARCHAR(100),
      quantity INT NOT NULL DEFAULT 0,
      unit VARCHAR(50) DEFAULT 'pcs',
      reorder_level INT DEFAULT 10,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      action VARCHAR(255) NOT NULL,
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await safeExecute(`
    ALTER TABLE users
    MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT
  `);

  await safeExecute(`
    ALTER TABLE water_orders
    MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT
  `);

  await seedDemoUsers();

  console.log("✅ Database tables checked/created.");
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
        (username, email, password_hash, role, phone, address)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          user.username,
          user.email,
          passwordHash,
          user.role,
          user.phone,
          user.address
        ]
      );

      console.log(`✅ Seeded user: ${user.email}`);
    }
  }
}

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", async (req, res) => {
  try {
    await testConnection();

    res.json({
      success: true,
      message: "Server and MySQL database connected successfully"
    });
  } catch (error) {
    console.error("Health error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server is running but database connection failed",
      error: error.message
    });
  }
});

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Correct server/index.js is running"
  });
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
      (username, email, password_hash, role, phone, address)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        username,
        email,
        passwordHash,
        finalRole,
        phone || null,
        address || null
      ]
    );

    try {
      await db.execute(
        "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
        [result.insertId, "REGISTER", `Created ${finalRole} account: ${email}`]
      );
    } catch (logError) {
      console.warn("Log skipped:", logError.message);
    }

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: result.insertId,
        username,
        email,
        role: finalRole,
        phone,
        address
      }
    });
  } catch (error) {
    console.error("Register error:", error.message);

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
        message: "Invalid login credentials. User not found."
      });
    }

    const user = users[0];
    const savedPassword = String(user.password_hash || "");

    let isPasswordCorrect = false;

    if (
      savedPassword.startsWith("$2a$") ||
      savedPassword.startsWith("$2b$") ||
      savedPassword.startsWith("$2y$")
    ) {
      isPasswordCorrect = await bcrypt.compare(password, savedPassword);
    } else {
      isPasswordCorrect = password === savedPassword;

      if (isPasswordCorrect) {
        const newHash = await bcrypt.hash(password, 10);

        await db.execute(
          "UPDATE users SET password_hash = ? WHERE id = ?",
          [newHash, user.id]
        );
      }
    }

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials. Wrong password."
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
      { expiresIn: "1d" }
    );

    try {
      await db.execute(
        "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
        [user.id, "LOGIN", "User logged in"]
      );
    } catch (logError) {
      console.warn("Log skipped:", logError.message);
    }

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
    console.error("Login error:", error.message);

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
      SELECT id, username, email, role, phone, address, created_at, updated_at
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

app.post("/api/users", async (req, res) => {
  try {
    const { username, email, phone, address, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Username, email, password, and role are required"
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
        message: "Email already exists"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      `
      INSERT INTO users
      (username, email, password_hash, role, phone, address)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        username,
        email,
        passwordHash,
        role,
        phone || null,
        address || null
      ]
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        id: result.insertId,
        username,
        email,
        role,
        phone,
        address
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to create user: ${error.message}`
    });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const { username, email, phone, address, role } = req.body;
    const db = getPool();

    await db.execute(
      `
      UPDATE users
      SET username = ?, email = ?, phone = ?, address = ?, role = ?
      WHERE id = ?
      `,
      [username, email, phone || null, address || null, role, req.params.id]
    );

    res.json({
      success: true,
      message: "User updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to update user: ${error.message}`
    });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const db = getPool();

    await db.execute("DELETE FROM users WHERE id = ?", [req.params.id]);

    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to delete user: ${error.message}`
    });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const db = getPool();

    const [orders] = await db.execute(`
      SELECT *
      FROM water_orders
      ORDER BY created_at DESC
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

app.post("/api/orders", async (req, res) => {
  try {
    const {
      user_id,
      customer_name,
      phone,
      address,
      quantity,
      price_per_container,
      order_type,
      status
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
      (user_id, customer_name, phone, address, quantity, price_per_container, total_amount, order_type, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user_id || null,
        customer_name,
        phone,
        address,
        finalQuantity,
        finalPrice,
        totalAmount,
        order_type || "online",
        status || "pending"
      ]
    );

    try {
      await db.execute(
        "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
        [
          user_id || null,
          "CREATE_ORDER",
          `Created order #${result.insertId}`
        ]
      );
    } catch (logError) {
      console.warn("Log skipped:", logError.message);
    }

    res.status(201).json({
      success: true,
      message: "Order recorded successfully",
      order: {
        id: result.insertId,
        user_id: user_id || null,
        customer_name,
        phone,
        address,
        quantity: finalQuantity,
        price_per_container: finalPrice,
        total_amount: totalAmount,
        order_type: order_type || "online",
        status: status || "pending"
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to record order: ${error.message}`
    });
  }
});

app.put("/api/orders/:id", async (req, res) => {
  try {
    const {
      customer_name,
      phone,
      address,
      quantity,
      price_per_container,
      order_type,
      status
    } = req.body;

    const finalQuantity = Number(quantity || 1);
    const finalPrice = Number(price_per_container || 30);
    const totalAmount = finalQuantity * finalPrice;

    const db = getPool();

    await db.execute(
      `
      UPDATE water_orders
      SET customer_name = ?, phone = ?, address = ?, quantity = ?,
          price_per_container = ?, total_amount = ?, order_type = ?, status = ?
      WHERE id = ?
      `,
      [
        customer_name,
        phone,
        address,
        finalQuantity,
        finalPrice,
        totalAmount,
        order_type || "online",
        status || "pending",
        req.params.id
      ]
    );

    res.json({
      success: true,
      message: "Order updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to update order: ${error.message}`
    });
  }
});

app.patch("/api/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const db = getPool();

    await db.execute("UPDATE water_orders SET status = ? WHERE id = ?", [
      status,
      req.params.id
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

app.delete("/api/orders/:id", async (req, res) => {
  try {
    const db = getPool();

    await db.execute("DELETE FROM water_orders WHERE id = ?", [req.params.id]);

    res.json({
      success: true,
      message: "Order deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to delete order: ${error.message}`
    });
  }
});

app.get("/api/inventory", async (req, res) => {
  try {
    const db = getPool();

    const [items] = await db.execute(`
      SELECT *
      FROM inventory_items
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch inventory: ${error.message}`
    });
  }
});

app.post("/api/inventory", async (req, res) => {
  try {
    const { name, category, quantity, unit, reorder_level } = req.body;
    const db = getPool();

    const [result] = await db.execute(
      `
      INSERT INTO inventory_items
      (name, category, quantity, unit, reorder_level)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        name,
        category || null,
        Number(quantity || 0),
        unit || "pcs",
        Number(reorder_level || 10)
      ]
    );

    res.status(201).json({
      success: true,
      message: "Inventory item created successfully",
      item: {
        id: result.insertId,
        name,
        category,
        quantity: Number(quantity || 0),
        unit: unit || "pcs",
        reorder_level: Number(reorder_level || 10)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to create inventory item: ${error.message}`
    });
  }
});

app.put("/api/inventory/:id", async (req, res) => {
  try {
    const { name, category, quantity, unit, reorder_level } = req.body;
    const db = getPool();

    await db.execute(
      `
      UPDATE inventory_items
      SET name = ?, category = ?, quantity = ?, unit = ?, reorder_level = ?
      WHERE id = ?
      `,
      [
        name,
        category || null,
        Number(quantity || 0),
        unit || "pcs",
        Number(reorder_level || 10),
        req.params.id
      ]
    );

    res.json({
      success: true,
      message: "Inventory item updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to update inventory item: ${error.message}`
    });
  }
});

app.delete("/api/inventory/:id", async (req, res) => {
  try {
    const db = getPool();

    await db.execute("DELETE FROM inventory_items WHERE id = ?", [
      req.params.id
    ]);

    res.json({
      success: true,
      message: "Inventory item deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to delete inventory item: ${error.message}`
    });
  }
});

app.get("/api/logs", async (req, res) => {
  try {
    const db = getPool();

    const [logs] = await db.execute(`
      SELECT *
      FROM activity_logs
      ORDER BY created_at DESC
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

  app.use((req, res) => {
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
    console.log("✅ MySQL connected successfully.");

    await initDatabase();
  } catch (error) {
    console.error("❌ Database setup failed:", error.message);
    console.error("Server is running, but database features may fail.");
  }
});
