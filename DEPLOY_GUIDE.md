# 🚀 Deploy Water Market to GitHub + Render

Complete step-by-step guide to push your project to GitHub and deploy it live on Render.

---

## PART 1 — Push to GitHub

### Step 1: Create a GitHub Account (if you don't have one)
1. Go to **https://github.com**
2. Click **Sign up** and create your account

### Step 2: Install Git (if not installed)
1. Go to **https://git-scm.com/downloads**
2. Download and install for your OS (Windows/Mac)
3. Open **Command Prompt** and verify:
   ```
   git --version
   ```

### Step 3: Create a New Repository on GitHub
1. Click the **+** icon in the top right → **New repository**
2. Fill in:
   - **Repository name**: `water-market-station`
   - **Description**: `Water Market Water Refilling Station Management System`
   - **Visibility**: Public (or Private)
   - ❌ Do NOT check "Add a README file"
3. Click **Create repository**
4. You'll see a page with commands — keep this page open

### Step 4: Push Your Code
Open **Command Prompt / Terminal** inside your project folder and run these commands **one by one**:

```bash
git init
git add .
git commit -m "Initial commit - Water Market Station"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/water-market-station.git
git push -u origin main
```

> ⚠️ Replace `YOUR_USERNAME` with your actual GitHub username.

> 💡 It may ask for your GitHub login. Use your GitHub username and a **Personal Access Token** as password.
>
> To create a token: GitHub → Settings → Developer Settings → Personal Access Tokens → Generate new token → Check "repo" → Copy the token.

### Step 5: Verify
Go to `https://github.com/YOUR_USERNAME/water-market-station` — you should see all your files there.

---

## PART 2 — Deploy on Render

### Step 1: Create a Render Account
1. Go to **https://render.com**
2. Click **Get Started for Free**
3. Sign up with your **GitHub account** (recommended — makes connecting repos easier)

### Step 2: Create a New Web Service
1. From the Render dashboard, click **New +** → **Web Service**
2. Connect your GitHub account if not already connected
3. Find and select your **water-market-station** repository
4. Click **Connect**

### Step 3: Configure the Service
Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `water-market-station` |
| **Region** | Singapore (closest to Philippines) |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `chmod +x render-build.sh && ./render-build.sh` |
| **Start Command** | `cd server && node server.js` |
| **Instance Type** | Free |

### Step 4: Add Environment Variables
Scroll down to **Environment Variables** and add these:

| Key | Value |
|-----|-------|
| `DB_HOST` | Your Aiven host (found in Aiven Console → Overview) |
| `DB_PORT` | Your Aiven port (found in Aiven Console → Overview) |
| `DB_USER` | `avnadmin` |
| `DB_PASSWORD` | Your Aiven password (found in Aiven Console → Overview) |
| `DB_NAME` | `defaultdb` |
| `JWT_SECRET` | Any random long string (e.g. `my-super-secret-key-2025`) |
| `PORT` | `3001` |

> ⚠️ Get your Aiven credentials from https://console.aiven.io → Your MySQL service → Overview tab.

### Step 5: Deploy
1. Click **Create Web Service**
2. Render will start building (takes 2-5 minutes)
3. Watch the deploy logs — you should see:
   ```
   📦 Installing frontend dependencies...
   🔧 Building frontend...
   📦 Installing server dependencies...
   🗄️ Setting up database...
   ✅ Build complete!
   ✅ Successfully connected to Aiven MySQL database
   ✅ Server running → http://localhost:3001
   ```

### Step 6: Access Your Live Site
Once deployed, Render gives you a URL like:
```
https://water-market-station.onrender.com
```

Click it — your Water Market Station is now **live on the internet**! 🎉

---

## PART 3 — Updating Your Site

Every time you make changes, just push to GitHub and Render auto-deploys:

```bash
git add .
git commit -m "Updated something"
git push
```

Render will automatically detect the push and redeploy within 2-3 minutes.

---

## ❓ Troubleshooting

### "Build failed" on Render
- Check the deploy logs for the exact error
- Make sure all environment variables are set correctly
- The build command should be exactly: `chmod +x render-build.sh && ./render-build.sh`

### "Cannot connect to database"
- Verify your Aiven MySQL service is still running at [console.aiven.io](https://console.aiven.io)
- Double-check the DB_HOST, DB_PORT, DB_USER, DB_PASSWORD values

### Site loads but login fails
- Make sure `DB_NAME` is set to `defaultdb` in Render env vars
- Check if `node db/setup.js` ran successfully in the build logs

### "Free instance spins down"
- Render free tier sleeps after 15 minutes of no traffic
- First visit after sleep takes ~30 seconds to wake up
- This is normal for free tier

### Push to GitHub fails with "permission denied"
- Use Personal Access Token instead of password
- GitHub → Settings → Developer Settings → Personal Access Tokens → Generate new token

---

## 📋 Quick Reference

| What | URL |
|------|-----|
| Your GitHub repo | `https://github.com/YOUR_USERNAME/water-market-station` |
| Your live site | `https://water-market-station.onrender.com` |
| Aiven MySQL dashboard | `https://console.aiven.io` |
| Render dashboard | `https://dashboard.render.com` |

---

## ✅ Done!

Your Water Market Station is now:
- 📂 Source code on **GitHub**
- 🌐 Live website on **Render**
- 🗄️ Database on **Aiven MySQL**
- 🔄 Auto-deploys when you push to GitHub
