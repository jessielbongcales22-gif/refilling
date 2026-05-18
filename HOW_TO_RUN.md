# 🚀 How to Run Water Market

## What You Need First
- Download & extract the ZIP file
- Install Node.js from https://nodejs.org (choose LTS)

---

## Open 2 Terminal / Command Prompt Windows

### 🟦 TERMINAL 1 — Backend (Aiven MySQL)

```bash
cd server
npm install
node db/setup.js
node server.js
```

✅ Success looks like:
```
✅ Successfully connected to Aiven MySQL database
✅ Server running → http://localhost:3001
```

---

### 🟩 TERMINAL 2 — Frontend (React App)

```bash
npm install
npm run dev
```

✅ Success looks like:
```
Local: http://localhost:5173
```

Open http://localhost:5173 in your browser.

---

## Login Credentials

| Role     | Email                      | Password  |
|----------|----------------------------|-----------|
| Admin    | admin@watermarket.com      | admin123  |
| Staff    | staff1@watermarket.com     | staff123  |
| Customer | Sign up via Register tab   | —         |

---

## How to Know if DB is Connected

Look at the **top bar** after logging in:
- 🟢 **Aiven DB** = Connected to MySQL cloud database ✅
- 🟡 **Local**    = Backend not running, using browser storage

Also look for the banner **below the top bar**:
- Green = "Connected to Aiven MySQL"
- Yellow = "Demo Mode — Backend server is not running"

---

## Common Issues

| Problem | Fix |
|---------|-----|
| `npm not found` | Install Node.js from nodejs.org |
| `Cannot connect to database` | Check internet connection. Aiven needs internet. |
| Login fails with Aiven DB badge showing | Run `node db/setup.js` again in server/ folder |
| Port 3001 already in use | Run: `npx kill-port 3001` then restart |
| Frontend shows blank page | Make sure `npm install` was run in the ROOT folder |

---

## Project Structure

```
📁 your-project/
├── 📁 server/          ← Node.js backend (run this first)
│   ├── server.js       ← Main API server
│   ├── .env            ← Aiven MySQL credentials (already configured)
│   └── db/
│       ├── setup.js    ← Creates tables & seeds data
│       └── connection.js
├── 📁 src/             ← React frontend
├── .env                ← Frontend config (VITE_USE_API=true)
└── package.json        ← Frontend dependencies
```
