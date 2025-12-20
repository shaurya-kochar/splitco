#!/bin/bash
BASE_URL="http://localhost:3001"

# Create user
curl -s -X POST "$BASE_URL/auth/send-otp" -H "Content-Type: application/json" -d '{"phone":"+919444444444"}' > /dev/null
U=$(curl -s -X POST "$BASE_URL/auth/verify-otp" -H "Content-Type: application/json" -d '{"phone":"+919444444444","otp":"123456","name":"Test"}')
USER_ID=$(echo "$U" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
TOKEN=$(echo "$U" | grep -o '"token":"[^"]*' | head -1 | cut -d'"' -f4)

# Create group
G=$(curl -s -X POST "$BASE_URL/groups" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"name":"Test","type":"group"}')
GROUP_ID=$(echo "$G" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Group ID: $GROUP_ID"

# Create expense
echo "Creating expense for group $GROUP_ID..."
curl -s -X POST "$BASE_URL/groups/$GROUP_ID/expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"amount\": 100,
    \"description\": \"Test\",
    \"paidBy\": {\"mode\": \"multiple\", \"payments\": [{\"userId\": \"$USER_ID\", \"amount\": 100}]},
    \"splits\": [{\"userId\": \"$USER_ID\", \"shareAmount\": 100}]
  }" > /dev/null

# Get balances
echo "Getting balances for group $GROUP_ID..."
curl -s -X GET "$BASE_URL/groups/$GROUP_ID/balances" -H "Authorization: Bearer $TOKEN"
echo
