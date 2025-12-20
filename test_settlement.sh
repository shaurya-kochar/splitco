#!/bin/bash
# Simple settlement test

# Send OTP and verify for User1
curl -s -X POST http://localhost:3001/auth/send-otp -H "Content-Type: application/json" -d '{"phone":"+911111111111"}' > /dev/null
U1=$(curl -s -X POST http://localhost:3001/auth/verify-otp -H "Content-Type: application/json" -d '{"phone":"+911111111111","otp":"123456","name":"User1"}')
TOKEN1=$(echo $U1 | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Create group
GRP=$(curl -s -X POST http://localhost:3001/groups -H "Authorization: Bearer $TOKEN1" -H "Content-Type: application/json" -d '{"name":"TestGrp"}')
GID=$(echo $GRP | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "Group ID: $GID"
echo "Testing settlements endpoint..."
curl -s http://localhost:3001/groups/$GID/settlements -H "Authorization: Bearer $TOKEN1" | python3 -m json.tool
