import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

console.log("BOOTING FIXED SERVER FILE");

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
          ? { rejectUnauthorized: false }
          : undefined
    });
  }

  return pool;
}

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", async (req, res) => {
  try {
    const db = getPool();
    await db.execute("SELECT 1 AS connected");

    res.json({
      success: true,
      message: "Server is running and MySQL is connected"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server is running but MySQL failed",
      error: error.message
    });
  }
});

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Fixed server.js is running"
  });
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
