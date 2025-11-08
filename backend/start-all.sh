#!/bin/bash

# GigStream Development Startup Script
# Starts all required services in the correct order

echo "🚀 Starting GigStream Services..."
echo ""

# Kill existing processes
echo "📋 Cleaning up existing processes..."
pkill -f "wallet-service.mjs" 2>/dev/null
pkill -f "wrangler dev" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 2

# Start Wallet Service (Port 3001)
echo ""
echo "1️⃣  Starting Circle Wallet Service (Port 3001)..."
cd "$(dirname "$0")"
node wallet-service.mjs > logs/wallet-service.log 2>&1 &
WALLET_PID=$!
sleep 3

# Check if wallet service started
if kill -0 $WALLET_PID 2>/dev/null; then
    echo "✅ Wallet Service started (PID: $WALLET_PID)"
    # Test health
    if curl -s -H "X-API-Secret: dev-secret-change-in-production" http://localhost:3001/health | grep -q "ok"; then
        echo "✅ Wallet Service health check passed"
    else
        echo "⚠️  Wallet Service health check failed"
    fi
else
    echo "❌ Wallet Service failed to start"
    exit 1
fi

# Start Backend API (Port 8787)
echo ""
echo "2️⃣  Starting Backend API (Port 8787)..."
npm run dev > logs/backend.log 2>&1 &
BACKEND_PID=$!
sleep 5

if kill -0 $BACKEND_PID 2>/dev/null; then
    echo "✅ Backend API started (PID: $BACKEND_PID)"
else
    echo "❌ Backend API failed to start"
    kill $WALLET_PID 2>/dev/null
    exit 1
fi

# Start Frontend (Port 3000)
echo ""
echo "3️⃣  Starting Frontend (Port 3000)..."
cd ../frontend
npm run dev > ../backend/logs/frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 3

if kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "✅ Frontend started (PID: $FRONTEND_PID)"
else
    echo "⚠️  Frontend may have failed to start"
fi

echo ""
echo "=========================================="
echo "🎉 GigStream Development Environment Ready!"
echo "=========================================="
echo ""
echo "📍 Services:"
echo "   • Wallet Service:  http://localhost:3001/health"
echo "   • Backend API:     http://localhost:8787"
echo "   • Frontend:        http://localhost:3000"
echo ""
echo "📝 Process IDs:"
echo "   • Wallet: $WALLET_PID"
echo "   • Backend: $BACKEND_PID"
echo "   • Frontend: $FRONTEND_PID"
echo ""
echo "📊 View logs:"
echo "   tail -f backend/logs/wallet-service.log"
echo "   tail -f backend/logs/backend.log"
echo "   tail -f backend/logs/frontend.log"
echo ""
echo "🛑 Stop all services:"
echo "   pkill -f 'wallet-service|wrangler dev|next dev'"
echo ""
echo "=========================================="
