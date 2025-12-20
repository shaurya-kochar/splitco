#!/bin/bash

BASE_URL="http://localhost:3001"

echo "========================================="
echo "Testing Multi-Payer & Flexible Settlement Flow"
echo "========================================="

# Test 1: Create 3 users
echo -e "\n1. Creating 3 users..."

# User 1
U1_RES=$(curl -s -X POST "$BASE_URL/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919999990001"}')
echo "User1 OTP sent: $U1_RES"

U1_VERIFY=$(curl -s -X POST "$BASE_URL/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919999990001","otp":"123456","name":"Alice","email":"alice@test.com"}')
USER1_ID=$(echo $U1_VERIFY | grep -o '"userId":"[^"]*' | cut -d'"' -f4)
USER1_TOKEN=$(echo $U1_VERIFY | grep -o '"sessionToken":"[^"]*' | cut -d'"' -f4)
echo "User1 created: ID=$USER1_ID"

# User 2
U2_RES=$(curl -s -X POST "$BASE_URL/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919999990002"}')

U2_VERIFY=$(curl -s -X POST "$BASE_URL/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919999990002","otp":"123456","name":"Bob","email":"bob@test.com"}')
USER2_ID=$(echo $U2_VERIFY | grep -o '"userId":"[^"]*' | cut -d'"' -f4)
USER2_TOKEN=$(echo $U2_VERIFY | grep -o '"sessionToken":"[^"]*' | cut -d'"' -f4)
echo "User2 created: ID=$USER2_ID"

# User 3
U3_RES=$(curl -s -X POST "$BASE_URL/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919999990003"}')

U3_VERIFY=$(curl -s -X POST "$BASE_URL/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919999990003","otp":"123456","name":"Charlie","email":"charlie@test.com"}')
USER3_ID=$(echo $U3_VERIFY | grep -o '"userId":"[^"]*' | cut -d'"' -f4)
USER3_TOKEN=$(echo $U3_VERIFY | grep -o '"sessionToken":"[^"]*' | cut -d'"' -f4)
echo "User3 created: ID=$USER3_ID"

# Test 2: Create a group
echo -e "\n2. Creating a group..."
GROUP_RES=$(curl -s -X POST "$BASE_URL/groups" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -d '{"name":"Test Multi-Payer","type":"group"}')
GROUP_ID=$(echo $GROUP_RES | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Group created: ID=$GROUP_ID"

# Test 3: Add members
echo -e "\n3. Adding members to group..."
curl -s -X POST "$BASE_URL/groups/$GROUP_ID/members" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER2_TOKEN" > /dev/null
echo "User2 joined"

curl -s -X POST "$BASE_URL/groups/$GROUP_ID/members" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER3_TOKEN" > /dev/null
echo "User3 joined"

# Test 4: Create expense with MULTIPLE payers
echo -e "\n4. Creating expense with MULTIPLE payers..."
echo "Scenario: ₹300 dinner - Alice paid ₹200, Bob paid ₹100, split equally 3 ways"

EXPENSE_RES=$(curl -s -X POST "$BASE_URL/groups/$GROUP_ID/expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -d "{
    \"amount\": 300,
    \"description\": \"Dinner with multiple payers\",
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
echo "Multi-payer expense created:"
echo "$EXPENSE_RES" | jq '.'

# Test 5: Check balances
echo -e "\n5. Checking balances after multi-payer expense..."
BALANCES=$(curl -s -X GET "$BASE_URL/groups/$GROUP_ID/balances" \
  -H "Authorization: Bearer $USER1_TOKEN")
echo "Balances:"
echo "$BALANCES" | jq '.'

echo -e "\nExpected balances:"
echo "- Alice: +₹100 (paid ₹200, owes ₹100)"
echo "- Bob: ±₹0 (paid ₹100, owes ₹100)"
echo "- Charlie: -₹100 (paid ₹0, owes ₹100)"

# Test 6: Record settlement by User3 (Charlie) even though he's not part of the debt
echo -e "\n6. Testing flexible settlement - Charlie records Bob's payment to Alice..."
echo "Scenario: Bob gave Alice ₹50 in cash, Charlie records it"

SETTLEMENT_RES=$(curl -s -X POST "$BASE_URL/groups/$GROUP_ID/settlements" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER3_TOKEN" \
  -d "{
    \"fromUserId\": \"$USER2_ID\",
    \"toUserId\": \"$USER1_ID\",
    \"amount\": 50,
    \"method\": \"cash\"
  }")
echo "Settlement recorded:"
echo "$SETTLEMENT_RES" | jq '.'

# Test 7: Check updated balances
echo -e "\n7. Checking balances after settlement..."
BALANCES_AFTER=$(curl -s -X GET "$BASE_URL/groups/$GROUP_ID/balances" \
  -H "Authorization: Bearer $USER1_TOKEN")
echo "Updated balances:"
echo "$BALANCES_AFTER" | jq '.'

echo -e "\nExpected balances after ₹50 settlement:"
echo "- Alice: +₹50 (was +100, received 50)"
echo "- Bob: -₹50 (was 0, but now recorded as owing 50 less to someone)"
echo "- Charlie: -₹100 (unchanged)"

echo -e "\n========================================="
echo "Test completed!"
echo "========================================="
