#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# VIDEO CONFERENCING API TEST SCRIPT
# ═══════════════════════════════════════════════════════════════

BASE_URL="http://localhost:8000"
MEETING_ID=""

echo "🎥 Video Conferencing API Tests"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════════
# 1. CREATE ZOOM MEETING
# ═══════════════════════════════════════════════════════════════

echo -e "${BLUE}1. Creating Zoom Meeting...${NC}"

RESPONSE=$(curl -s -X POST "$BASE_URL/api/video-meetings/create" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "zoom",
    "title": "Test Sales Call",
    "start_time": "2024-12-15T15:00:00Z",
    "duration_minutes": 60
  }')

echo "$RESPONSE" | jq '.'

# Extract meeting ID
MEETING_ID=$(echo "$RESPONSE" | jq -r '.meeting_id')

if [ "$MEETING_ID" != "null" ] && [ -n "$MEETING_ID" ]; then
    echo -e "${GREEN}✅ Meeting created: $MEETING_ID${NC}"
else
    echo -e "${RED}❌ Failed to create meeting${NC}"
    exit 1
fi

echo ""
echo "---"
echo ""

# ═══════════════════════════════════════════════════════════════
# 2. GET UPCOMING MEETINGS
# ═══════════════════════════════════════════════════════════════

echo -e "${BLUE}2. Getting Upcoming Meetings...${NC}"

curl -s "$BASE_URL/api/video-meetings/meetings?upcoming=true" | jq '.'

echo ""
echo "---"
echo ""

# ═══════════════════════════════════════════════════════════════
# 3. GET MEETING DETAILS
# ═══════════════════════════════════════════════════════════════

echo -e "${BLUE}3. Getting Meeting Details...${NC}"

curl -s "$BASE_URL/api/video-meetings/meetings/$MEETING_ID" | jq '.'

echo ""
echo "---"
echo ""

# ═══════════════════════════════════════════════════════════════
# 4. LIST INTEGRATIONS
# ═══════════════════════════════════════════════════════════════

echo -e "${BLUE}4. Listing Connected Integrations...${NC}"

curl -s "$BASE_URL/api/integrations/list" | jq '.'

echo ""
echo "---"
echo ""

# ═══════════════════════════════════════════════════════════════
# 5. SIMULATE ZOOM WEBHOOK (Recording Ready)
# ═══════════════════════════════════════════════════════════════

echo -e "${BLUE}5. Simulating Zoom Recording Ready Webhook...${NC}"

curl -s -X POST "$BASE_URL/api/webhooks/zoom" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"recording.completed\",
    \"payload\": {
      \"object\": {
        \"id\": \"123456789\",
        \"uuid\": \"test-uuid\"
      }
    }
  }" | jq '.'

echo ""
echo "---"
echo ""

# ═══════════════════════════════════════════════════════════════
# 6. TRIGGER AI ANALYSIS (Manual)
# ═══════════════════════════════════════════════════════════════

echo -e "${BLUE}6. Triggering AI Analysis...${NC}"

curl -s -X POST "$BASE_URL/api/video-meetings/meetings/$MEETING_ID/analyze" | jq '.'

echo ""
echo "---"
echo ""

# ═══════════════════════════════════════════════════════════════
# 7. GET PAST MEETINGS
# ═══════════════════════════════════════════════════════════════

echo -e "${BLUE}7. Getting Past Meetings...${NC}"

curl -s "$BASE_URL/api/video-meetings/meetings?upcoming=false" | jq '.'

echo ""
echo "---"
echo ""

# ═══════════════════════════════════════════════════════════════
# COMPLETE
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${GREEN}✅ All tests complete!${NC}"
echo ""
echo "Meeting ID: $MEETING_ID"
echo ""
echo "Next steps:"
echo "1. Check meeting in database"
echo "2. Test OAuth flow by visiting:"
echo "   - $BASE_URL/api/integrations/zoom/authorize"
echo "   - $BASE_URL/api/integrations/teams/authorize"
echo "   - $BASE_URL/api/integrations/google/authorize"
echo "3. Test webhooks with real Zoom account"
echo ""

