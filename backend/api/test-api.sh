 #!/bin/bash

echo "🧪 Testing Medicare API Endpoints..."
echo ""

BASE_URL="http://localhost:4000"

# Test Health Check
echo "1. Testing Health Check..."
curl -s "$BASE_URL/health" | jq '.' || echo "❌ Health check failed"
echo ""

# Test Swagger Docs
echo "2. Testing Swagger Docs..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "$BASE_URL/docs" || echo "❌ Swagger docs not accessible"
echo ""

# Test Doctors Endpoint (Public)
echo "3. Testing GET /doctors (Public)..."
curl -s "$BASE_URL/doctors?page=1&limit=5" | jq '.success' || echo "❌ Doctors endpoint failed"
echo ""

echo "✅ Basic API tests completed!"
echo ""
echo "📚 API Documentation: $BASE_URL/docs"
echo "🏥 Health Check: $BASE_URL/health"
echo "👨‍⚕️ Doctors List: $BASE_URL/doctors"

