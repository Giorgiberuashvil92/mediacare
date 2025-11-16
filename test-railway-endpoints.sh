#!/bin/bash

# Railway Endpoint Testing Script
RAILWAY_URL="https://mediacare-production.up.railway.app"

echo "🚂 Testing Railway Endpoints..."
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -n "Testing ${description}... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "${RAILWAY_URL}${endpoint}")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "${RAILWAY_URL}${endpoint}")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✅ OK (${http_code})${NC}"
    elif [ "$http_code" = "404" ]; then
        echo -e "${RED}❌ NOT FOUND (404)${NC}"
    elif [ "$http_code" = "401" ]; then
        echo -e "${YELLOW}⚠️  UNAUTHORIZED (401) - Expected for protected routes${NC}"
    else
        echo -e "${YELLOW}⚠️  ${http_code}${NC}"
    fi
}

echo "📋 Public Endpoints (No Auth Required):"
echo "----------------------------------------"
test_endpoint "GET" "/" "{}" "Root endpoint"
test_endpoint "GET" "/health" "{}" "Health check"
test_endpoint "GET" "/docs" "{}" "Swagger documentation"
test_endpoint "GET" "/specializations" "{}" "Get specializations"
test_endpoint "GET" "/doctors" "{}" "Get all doctors"
test_endpoint "POST" "/auth/register" '{"name":"Test","email":"test@test.com","password":"Test123!","role":"patient"}' "Register user"
test_endpoint "POST" "/auth/login" '{"email":"test@test.com","password":"Test123!"}' "Login"

echo ""
echo "🔒 Protected Endpoints (Auth Required):"
echo "--------------------------------------"
test_endpoint "GET" "/auth/refresh" "{}" "Refresh token"
test_endpoint "GET" "/profile" "{}" "Get profile"
test_endpoint "GET" "/doctors/dashboard/stats" "{}" "Doctor dashboard stats"
test_endpoint "GET" "/doctors/dashboard/appointments" "{}" "Doctor appointments"
test_endpoint "GET" "/doctors/dashboard/schedule" "{}" "Doctor schedule"
test_endpoint "GET" "/doctors/patients" "{}" "Doctor patients"
test_endpoint "GET" "/appointments/patient" "{}" "Patient appointments"
test_endpoint "GET" "/admin/users" "{}" "Admin users"
test_endpoint "GET" "/admin/stats" "{}" "Admin stats"
test_endpoint "GET" "/admin/appointments" "{}" "Admin appointments"

echo ""
echo "=================================="
echo "✅ Testing complete!"
echo ""
echo "💡 Note: 401 errors are expected for protected routes without auth token"
echo "💡 Note: 404 means endpoint doesn't exist (Railway deployment issue)"

