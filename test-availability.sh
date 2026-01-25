#!/bin/bash

# Test script for doctor availability endpoint
# This tests that video and home-visit booked slots are separated correctly

BASE_URL="http://192.168.0.103:4000"
DOCTOR_ID="6973bf18763ce3fbb6cce68c"

echo "🧪 Testing Doctor Availability Endpoint"
echo "========================================"
echo ""

# Test 1: Get all availability (both video and home-visit)
echo "📋 Test 1: Get all availability (both types)"
echo "--------------------------------------------"
curl -s "${BASE_URL}/doctors/${DOCTOR_ID}/availability" | jq '.'
echo ""
echo ""

# Test 2: Get only video availability
echo "📋 Test 2: Get only video availability"
echo "--------------------------------------"
curl -s "${BASE_URL}/doctors/${DOCTOR_ID}/availability?type=video" | jq '.'
echo ""
echo ""

# Test 3: Get only home-visit availability
echo "📋 Test 3: Get only home-visit availability"
echo "--------------------------------------------"
curl -s "${BASE_URL}/doctors/${DOCTOR_ID}/availability?type=home-visit" | jq '.'
echo ""
echo ""

# Test 4: Check booked slots in response
echo "📋 Test 4: Check booked slots separation"
echo "----------------------------------------"
echo "Looking for bookedSlots in response..."
RESPONSE=$(curl -s "${BASE_URL}/doctors/${DOCTOR_ID}/availability")
echo "$RESPONSE" | jq '.data[] | {date: .date, type: .type, bookedSlots: .bookedSlots}'
echo ""
echo ""

# Test 5: Verify that video and home-visit have different booked slots
echo "📋 Test 5: Verify separation of booked slots"
echo "---------------------------------------------"
echo "Video booked slots:"
echo "$RESPONSE" | jq '.data[] | select(.type == "video") | {date: .date, bookedSlots: .bookedSlots}'
echo ""
echo "Home-visit booked slots:"
echo "$RESPONSE" | jq '.data[] | select(.type == "home-visit") | {date: .date, bookedSlots: .bookedSlots}'
echo ""
echo ""

echo "✅ Testing complete!"
echo ""
echo "💡 Expected behavior:"
echo "   - Video appointments should only appear in 'video' type availability"
echo "   - Home-visit appointments should only appear in 'home-visit' type availability"
echo "   - bookedSlots should be different for each type"
