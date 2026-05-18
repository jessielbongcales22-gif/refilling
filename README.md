# 💧 Water Market — Water Refilling Station Management System

A full-stack web application for managing a water refilling station with **Aiven MySQL** database, **Node.js/Express** backend, and **React** frontend.

---

## 🏗️ Architecture

```
┌──────────────────┐     REST API      ┌──────────────────┐
│   React Frontend │ ◄────────────────► │  Node.js Backend │
│   (Vite + TS)    │     HTTP/JSON     │  (Express)       │
└──────────────────┘                   └────────┬─────────┘
                                                │
                                          MySQL Protocol
                                          (SSL encrypted)
                                                │
                                   ┌────────────▼─────────┐
                                   │   Aiven MySQL Cloud  │
                                   │   Managed Database   │
                                   └──────────────────────┘
```

---

## 📋 Prerequisites

- **Node.js** 18+ installed
- **Aiven account** (free tier available at [aiven.io](https://aiven.io))
- **MySQL Workbench** (optional, for database management)

---

## 🚀 Setup Guide

### Step 1: Create Aiven MySQL Service

1. Go to [console.aiven.io](https://console.aiven.io) and sign up/log in
2. Click **Create Service** → Select **MySQL**
3. Choose your cloud provider and region
4. Select a plan (Free tier works for development)
5. Name your service (e.g., `water-market-db`)
6. Wait for the service to be ready (~2 minutes)

### Step 2: Get Connection Details

From your Aiven MySQL service page:

1. Go to **Overview** tab
2. Copy these values:
   - **Host** (e.g., `water-market-db-yourproject.aivencloud.com`)
   - **Port** (e.g., `25060`)
   - **User** (usually `avnadmin`)
   - **Password** (click the eye icon to reveal)

3. Download SSL certificates:
   - Scroll to **Connection information** section
   - Download **CA certificate** → save as `server/certs/ca.pem`
   - Download **Client certificate** → save as `server/certs/service-cert.pem`
   - Download **Client key** → save as `server/certs/service-key.pem`

### Step 3: Connect with MySQL Workbench (Optional)

1. Open MySQL Workbench
2. Click **+** to create a new connection
3. Fill in:
   - **Connection Name**: Water Market Aiven
   - **Hostname**: Your Aiven host
   - **Port**: Your Aiven port
   - **Username**: `avnadmin`
   - **Password**: Store in vault → paste your password
4. Go to **SSL** tab:
   - **Use SSL**: Require
   - **SSL CA File**: Path to `ca.pem`
   - **SSL Cert File**: Path to `service-cert.pem`
   - **SSL Key File**: Path to `service-key.pem`
5. Click **Test Connection** → should succeed
6. Click **OK**

### Step 4: Set Up Database Schema

**Option A: Using MySQL Workbench**
1. Open your connection in MySQL Workbench
2. Open `server/db/schema.sql`
3. Execute the entire file (⚡ lightning bolt icon)

**Option B: Using the setup script**
1. Configure `.env` first (see Step 5)
2. Run: `cd server && npm run db:setup`

### Step 5: Configure Backend

```bash
cd server
npm install

# Create .env file
cp .env.example .env
```

Edit `server/.env`:
```env
DB_HOST=your-service.aivencloud.com
DB_PORT=25060
DB_USER=avnadmin
DB_PASSWORD=your-aiven-password
DB_NAME=water_market

# SSL Certificates (paths relative to server/ directory)
DB_SSL_CA=./certs/ca.pem

# JWT secret (generate a random string)
JWT_SECRET=your-random-secret-key-here

PORT=3001
FRONTEND_URL=http://localhost:5173
```

### Step 6: Start the Backend

```bash
cd server
npm start
# or for development with auto-reload:
npm run dev
```

You should see:
```
✅ Successfully connected to Aiven MySQL database
✅ Database setup complete
🌊 Water Market API running on http://localhost:3001
```

### Step 7: Configure & Start the Frontend

```bash
# In the project root
npm install

# Create .env to enable API mode
cp .env.example .env
```

Edit `.env`:
```env
# Set to true to use Aiven MySQL via backend API
# Set to false for demo mode (localStorage only)
VITE_USE_API=true
VITE_API_URL=http://localhost:3001/api
```

Start the frontend:
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔐 Default Login Credentials

After running the database setup:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@watermarket.com | admin123 |
| **Staff** | staff1@watermarket.com | staff123 |
| **Customer** | Register via signup page | — |

> ⚠️ In production, change these passwords immediately!

---

## 📁 Project Structure

```
├── server/                    # Node.js Backend
│   ├── server.js             # Express API server
│   ├── package.json          # Backend dependencies
│   ├── .env.example          # Environment template
│   ├── db/
│   │   ├── connection.js     # Aiven MySQL connection (SSL)
│   │   ├── schema.sql        # Database schema + seed data
│   │   └── setup.js          # Database setup script
│   └── certs/                # SSL certificates from Aiven
│       ├── ca.pem
│       ├── service-cert.pem
│       └── service-key.pem
│
├── src/                       # React Frontend
│   ├── api/
│   │   └── client.ts         # API client (fetch wrapper)
│   ├── context/
│   │   ├── AuthContext.tsx   # Auth (API or localStorage)
│   │   └── DataContext.tsx   # Data (API or localStorage)
│   ├── pages/
│   │   ├── AuthPage.tsx      # Login + Signup (combined)
│   │   ├── AdminDashboard.tsx # Admin-specific dashboard
│   │   ├── StaffDashboard.tsx # Staff-specific dashboard
│   │   ├── CustomerDashboard.tsx # Customer dashboard
│   │   ├── OrderManagement.tsx
│   │   ├── InventoryManagement.tsx
│   │   ├── Reports.tsx
│   │   ├── PlaceOrder.tsx
│   │   └── UserManagement.tsx
│   ├── components/
│   │   └── Layout.tsx        # Sidebar + topbar
│   ├── types.ts              # TypeScript interfaces
│   └── data/
│       └── seed.ts           # Demo seed data
│
├── .env.example              # Frontend env template
└── index.html
```

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/auth/login` | No | — | Login with email/password |
| POST | `/api/auth/register` | No | — | Register as customer |
| GET | `/api/users` | Yes | Admin | List all users |
| PUT | `/api/users/:id/role` | Yes | Admin | Change user role |
| GET | `/api/products` | Yes | All | List all products |
| POST | `/api/products` | Yes | Admin/Staff | Create product |
| PUT | `/api/products/:id` | Yes | Admin/Staff | Update product |
| DELETE | `/api/products/:id` | Yes | Admin | Delete product |
| GET | `/api/orders` | Yes | All | List orders (customers see own) |
| POST | `/api/orders` | Yes | All | Create new order |
| PUT | `/api/orders/:id` | Yes | All | Update order status |
| GET | `/api/reports/summary` | Yes | Admin/Staff | Get sales summary |

---

## 🔄 Switching Between Demo and Live Mode

**Demo Mode (localStorage, no backend needed):**
```env
VITE_USE_API=false
```

**Live Mode (Aiven MySQL via backend):**
```env
VITE_USE_API=true
VITE_API_URL=http://localhost:3001/api
```

The frontend automatically switches behavior based on `VITE_USE_API`. In demo mode, all data is stored in the browser's localStorage. In live mode, all operations go through the backend API to your Aiven MySQL database.

---

## 🗄️ Database Schema

```sql
users (id, username, email, password_hash, role, phone, address, created_at)
products (id, name, type, price, stock, unit, description, min_stock, created_at)
orders (id, customer_id, customer_name, total_amount, status, payment_method, payment_status, delivery_address, notes, created_at)
order_items (id, order_id, product_id, product_name, quantity, price, subtotal)
```

---

## 🚀 Deployment

### Backend Deployment Options
- **Aiven**: Deploy alongside your MySQL service
- **Railway**: Connect your GitHub repo
- **Render**: Free tier available
- **DigitalOcean App Platform**
- **Any VPS with Node.js**

### Frontend Deployment
- **Vercel**: `npm run build` → deploy `dist/`
- **Netlify**: Same as above
- **GitHub Pages**

### Production .env for Backend
```env
DB_HOST=your-production-aiven-host.aivencloud.com
DB_PORT=25060
DB_USER=avnadmin
DB_PASSWORD=your-production-password
DB_NAME=water_market
DB_SSL_CA=./certs/ca.pem
JWT_SECRET=long-random-production-secret
PORT=3001
FRONTEND_URL=https://your-frontend-domain.com
```

---

## 🛠️ Troubleshooting

**"Database connection failed"**
- Verify your Aiven service is running
- Check host, port, username, password in `.env`
- Ensure SSL certificates are downloaded correctly
- Aiven services require SSL — never disable it in production

**"ECONNREFUSED"**
- Make sure the backend is running (`npm start` in `server/`)
- Check that `PORT=3001` matches your frontend `VITE_API_URL`

**"CORS error"**
- Add your frontend URL to `FRONTEND_URL` in `server/.env`

**Frontend shows "Loading data..." forever**
- Check browser console for API errors
- Verify `VITE_USE_API=true` and `VITE_API_URL` are correct
- Try `VITE_USE_API=false` for demo mode
