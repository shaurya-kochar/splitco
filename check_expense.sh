#!/bin/bash

BASE_URL="http://localhost:3001"

# Create a simple test
curl -s -X POST "$BASE_URL/auth/send-otp" -H "Content-Type: application/json" -d '{"phone":"+919222222221"}' > /dev/null
USER=$(curl -s -X POST "$BASE_URL/auth/verify-otp" -H "Content-Type: application/json" -d '{"phone":"+919222222221","otp":"123456","name":"TestUser"}')
USER_ID=$(echo "$USER" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
USER_TOKEN=$(echo "$USER" | grep -o '"token":"[^"]*' | head -1 | cut -d'"' -f4)

GRP=$(curl -s -X POST "$BASE_URL/groups" -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN" -d '{"name":"Test","type":"group"}')
GROUP_ID=$(echo "$GRP" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

echo "Creating multi-payer expense..."
EXP=$(curl -s -X POST "$BASE_URL/groups/$GROUP_ID/expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d "{
    \"amount\": 100,
    \"description\": \"Test\",
    \"paidBy\": {
      \"mode\": \"multiple\",
      \"payments\": [
        {\"userId\": \"$USER_ID\", \"amount\": 100}
      ]
    },
    \"splits\": [
      {\"userId\": \"$USER_ID\", \"shareAmount\": 100}
    ]
  }")
echo "Response: $EXP"

echo -e "\nGetting expenses..."
EXPENSES=$(curl -s -X GET "$BASE_URL/groups/$GROUP_ID/expenses" -H "Authorization: Bearer $USER_TOKEN")
echo "$EXPENSES"
