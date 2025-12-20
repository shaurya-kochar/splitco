#!/bin/bash

BASE_URL="http://localhost:3001"
echo "Testing Complete Multi-Payer Flow..."

# Create Alice
curl -s -X POST "$BASE_URL/auth/send-otp" -H "Content-Type: application/json" -d '{"phone":"+919111111111"}' > /dev/null
ALICE=$(curl -s -X POST "$BASE_URL/auth/verify-otp" -H "Content-Type: application/json" -d '{"phone":"+919111111111","otp":"123456","name":"Alice"}')
ALICE_ID=$(echo "$ALICE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
ALICE_TOKEN=$(echo "$ALICE" | grep -o '"token":"[^"]*' | head -1 | cut -d'"' -f4)

# Create Bob
curl -s -X POST "$BASE_URL/auth/send-otp" -H "Content-Type: application/json" -d '{"phone":"+919111111112"}' > /dev/null
BOB=$(curl -s -X POST "$BASE_URL/auth/verify-otp" -H "Content-Type: application/json" -d '{"phone":"+919111111112","otp":"123456","name":"Bob"}')
BOB_ID=$(echo "$BOB" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
BOB_TOKEN=$(echo "$BOB" | grep -o '"token":"[^"]*' | head -1 | cut -d'"' -f4)

# Create Charlie
curl -s -X POST "$BASE_URL/auth/send-otp" -H "Content-Type: application/json" -d '{"phone":"+919111111113"}' > /dev/null
CHARLIE=$(curl -s -X POST "$BASE_URL/auth/verify-otp" -H "Content-Type: application/json" -d '{"phone":"+919111111113","otp":"123456","name":"Charlie"}')
CHARLIE_ID=$(echo "$CHARLIE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
CHARLIE_TOKEN=$(echo "$CHARLIE" | grep -o '"token":"[^"]*' | head -1 | cut -d'"' -f4)

echo "✓ Users created:"
echo "  Alice: $ALICE_ID"
echo "  Bob: $BOB_ID"
echo "  Charlie: $CHARLIE_ID"

# Create group
GRP=$(curl -s -X POST "$BASE_URL/groups" -H "Content-Type: application/json" -H "Authorization: Bearer $ALICE_TOKEN" -d '{"name":"Test Group","type":"group"}')
GROUP_ID=$(echo "$GRP" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo -e "\n✓ Group created: $GROUP_ID"

# Add members
curl -s -X POST "$BASE_URL/groups/$GROUP_ID/members" -H "Authorization: Bearer $BOB_TOKEN" > /dev/null
curl -s -X POST "$BASE_URL/groups/$GROUP_ID/members" -H "Authorization: Bearer $CHARLIE_TOKEN" > /dev/null
echo "✓ Members added"

# Create multi-payer expense
echo -e "\n📝 Creating multi-payer expense:"
echo "   Total: ₹300 (Alice ₹200, Bob ₹100)"
echo "   Split: 3 ways (₹100 each)"
EXP=$(curl -s -X POST "$BASE_URL/groups/$GROUP_ID/expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d "{
    \"amount\": 300,
    \"description\": \"Dinner\",
    \"paidBy\": {
      \"mode\": \"multiple\",
      \"payments\": [
        {\"userId\": \"$ALICE_ID\", \"amount\": 200},
        {\"userId\": \"$BOB_ID\", \"amount\": 100}
      ]
    },
    \"splits\": [
      {\"userId\": \"$ALICE_ID\", \"shareAmount\": 100},
      {\"userId\": \"$BOB_ID\", \"shareAmount\": 100},
      {\"userId\": \"$CHARLIE_ID\", \"shareAmount\": 100}
    ]
  }")
echo "✓ Expense created"

# Check balances
echo -e "\n💰 Balances after expense:"
BAL=$(curl -s -X GET "$BASE_URL/groups/$GROUP_ID/balances" -H "Authorization: Bearer $ALICE_TOKEN")
echo "$BAL"

echo -e "\n📊 Expected:"
echo "  Alice: +₹100 (paid ₹200, owes ₹100)"
echo "  Bob: ±₹0 (paid ₹100, owes ₹100)"
echo "  Charlie: -₹100 (paid ₹0, owes ₹100)"

# Settlement by Charlie (third party)
echo -e "\n💸 Charlie recording settlement:"
echo "   Bob → Alice: ₹50 (cash)"
SETTLE=$(curl -s -X POST "$BASE_URL/groups/$GROUP_ID/settlements" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CHARLIE_TOKEN" \
  -d "{
    \"fromUserId\": \"$BOB_ID\",
    \"toUserId\": \"$ALICE_ID\",
    \"amount\": 50,
    \"method\": \"cash\"
  }")
echo "✓ Settlement recorded"

# Final balances
echo -e "\n💰 Final balances:"
BAL2=$(curl -s -X GET "$BASE_URL/groups/$GROUP_ID/balances" -H "Authorization: Bearer $ALICE_TOKEN")
echo "$BAL2"

echo -e "\n✅ Test completed!"
