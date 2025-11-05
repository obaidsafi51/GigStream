#!/bin/bash
# Test GigStream Backend API

echo "🧪 Testing GigStream Backend API"
echo "=================================="
echo ""

# Wait for server to be ready
echo "⏳ Waiting for server to start..."
for i in {1..10}; do
  if curl -s http://localhost:8787/health > /dev/null 2>&1; then
    echo "✅ Server is ready!"
    break
  fi
  echo "   Attempt $i/10..."
  sleep 2
done

echo ""
echo "📍 Testing Endpoints:"
echo "--------------------"

# Test root endpoint
echo ""
echo "1️⃣ Root endpoint (/):"
curl -s http://localhost:8787/ | jq '.' 2>/dev/null || curl -s http://localhost:8787/

# Test health endpoint
echo ""
echo "2️⃣ Health endpoint (/health):"
curl -s http://localhost:8787/health | jq '.' 2>/dev/null || curl -s http://localhost:8787/health

# Test API v1 info
echo ""
echo "3️⃣ API v1 info (/api/v1):"
curl -s http://localhost:8787/api/v1 | jq '.' 2>/dev/null || curl -s http://localhost:8787/api/v1

# Test demo endpoint
echo ""
echo "4️⃣ Demo workers (/api/v1/demo/workers):"
curl -s http://localhost:8787/api/v1/demo/workers | jq '.' 2>/dev/null || curl -s http://localhost:8787/api/v1/demo/workers

echo ""
echo ""
echo "✅ API tests complete!"
