#!/bin/bash

# Production Deployment Script
echo "🚀 Starting Deployment Process..."

# 1. Install Dependencies
echo "📦 Installing dependencies..."
npm install

# 2. Sync Database
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# 3. Build Project
echo "🏗️ Building frontend and backend..."
npm run build

# 4. Restart Server
echo "🔄 Restarting PM2 process..."
pm2 restart ecosystem.config.js --env production

echo "✅ Deployment Successful!"
