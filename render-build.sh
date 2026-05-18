#!/usr/bin/env bash
# This script runs on Render during deployment

set -e

echo "📦 Installing frontend dependencies..."
npm install

echo "🔧 Building frontend..."
VITE_API_URL=/api VITE_USE_API=true npm run build

echo "📦 Installing server dependencies..."
cd server
npm install

echo "🗄️ Setting up database..."
node db/setup.js

echo "✅ Build complete!"
