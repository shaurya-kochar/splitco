#!/bin/bash

BASE_URL="http://localhost:3001"

echo "Testing Multi-Payer Expense..."

# Create 3 users
echo "Creating users..."
U1=$(curl -s -X POST "$BASE_URL/auth/send-otp" -H "Content-Type: application/json" -d '{"phone":"+919999991001"}')
U1V=$(curl -s -X POST "$BASE_URL/auth/verify-otp" -H "Content-Type: application/json" -d '{"phone":"+919999991001","otp":"123456","name":"Alice"}')
USER1_ID=$(echo $U1V | grep -o '"userId":"[^"]*' | cut -d'"' -f4)
USER1_TOKEN=$(echo $U1V | grep -o '"sessionToken":"[^"]*' | cut -d'"' -f4)

U2=$(curl -s -X POST "$BASE_URL/auth/send-otp" -H "Content-Type: application/json" -d '{"phone":"+919999991002"}')
U2V=$(curl -s -X POST "$BASE_URL/auth/verify-otp" -H "Content-Type: application/json" -d '{"phone":"+919999991002","otp":"123456","name":"Bob"}')
USER2_ID=$(echo $U2V | grep -o '"userId":"[^"]*' | cut -d'"' -f4)
USER2_TOKEN=$(echo $U2V | grep -o '"sessionToken":"[^"]*' | cut -d'"' -f4)

U3=$(curl -s -X POST "$BASE_URL/auth/send-otp" -H "Content-Type: application/json" -d '{"phone":"+919999991003"}')
U3V=$(curl -s -X POST "$BASE_URL/auth/verify-otp" -H "Content-Type: application/json" -d '{"phone":"+919999991003","otp":"123456","name":"Charlie"}')
USER3_ID=$(echo $U3V | grep -o '"userId":"[^"]*' | cut -d'"' -f4)
USER3_TOKEN=$(echo $U3V | grep -o '"sessionToken":"[^"]*' | cut -d'"' -f4)

echo "User IDs: Alice=$USER1_ID Bob=$USER2_ID Charlie=$USER3_ID"

# Create group
echo "Creating group..."
GRP=$(curl -s -X POST "$BASE_URL/groups" -H "Content-Type: application/json" -H "Authorization: Bearer $USER1_TOKEN" -d '{"name":"MultiPayer Test","type":"group"}')
GROUP_ID=$(echo $GRP | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Group ID: $GROUP_ID"

# Add members
curl -s -X POST "$BASE_URL/groups/$GROUP_ID/members" -H "Authorization: Bearer $USER2_TOKEN" > /dev/null
curl -s -X POST "$BASE_URL/groups/$GROUP_ID/members" -H "Authorization: Bearer $USER3_TOKEN" > /dev/null
echo "Members added"

# Create multi-payer expense
echo -e "\nCreating multi-payer expense (Alice ₹200, Bob ₹100, split 3 ways ₹100 each)..."
EXP=$(curl -s -X POST "$BASE_URL/groups/$GROUP_ID/expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -d "{
    \"amount\": 300,
    \"description\": \"Dinner\",
    \"paidBy\": {
      \"mode\": \"multiple\",
      \"payments\": [
        {\"userId\": \"$USER1_ID\", \"amount\": 200},
        {\"userId\": \"$USER2_ID\", \"amount\": 100}
      ]
    },
    \"splits\": [
      {\"userId\": \"$USER1_ID\", \"shareAmount\": 100},
      {\"userId\": \"$USER2_ID\", \"shareAmount\": 100},
      {\"userId\": \"$USER3_ID\", \"shareAmount\": 100}
    ]
  }")
echo "Expense response: $EXP"

# Check balances
echo -e "\nBalances:"
BAL=$(curl -s -X GET "$BASE_URL/groups/$GROUP_ID/balances" -H "Authorization: Bearer $USER1_TOKEN")
echo "$BAL"

# Record settlement by Charlie (third party)
echo -e "\nCharlie recording settlement: Bob paying Alice ₹50..."
SETTLE=$(curl -s -X POST "$BASE_URL/groups/$GROUP_ID/settlements" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER3_TOKEN" \
  -d "{
    \"fromUserId\": \"$USER2_ID\",
    \"toUserId\": \"$USER1_ID\",
    \"amount\": 50,
    \"method\": \"cash\"
  }")
echo "Settlement response: $SETTLE"

# Check updated balances
echo -e "\nUpdated balances:"
BAL2=$(curl -s -X GET "$BASE_URL/groups/$GROUP_ID/balances" -H "Authorization: Bearer $USER1_TOKEN")
echo "$BAL2"
