#!/bin/bash

# Semantic Search - Quick Run Commands
# Usage: source RUN_COMMANDS.sh

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Semantic Search - Quick Commands${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

# ============================================
# SETUP COMMANDS
# ============================================

reset_db() {
    echo -e "${YELLOW}🔄 Resetting database...${NC}"
    cd backend
    npx prisma migrate reset --force
    cd ..
}

setup_pgvector() {
    echo -e "${YELLOW}🔧 Setting up pgvector...${NC}"
    cd backend
    npx ts-node src/scripts/run-pgvector-setup.ts
    cd ..
}

# ============================================
# START SERVICES
# ============================================

start_ai() {
    echo -e "${GREEN}🤖 Starting AI Service...${NC}"
    cd ai-service
    source .venv/bin/activate
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
}

start_backend() {
    echo -e "${GREEN}🚀 Starting Backend...${NC}"
    cd backend
    npm run start:dev
}

# ============================================
# BACKFILL & TESTING
# ============================================

backfill() {
    local limit=${1:-100}
    echo -e "${YELLOW}📊 Backfilling embeddings (limit: $limit)...${NC}"
    cd backend
    npx ts-node src/scripts/backfill-embeddings.ts --limit $limit
    cd ..
}

test_ai_service() {
    echo -e "${BLUE}🧪 Testing AI Service...${NC}"
    curl -X POST http://localhost:8000/api/v1/search/vector/embeddings \
      -H "Content-Type: application/json" \
      -d '{"text": "test message"}' | jq
}

test_semantic_search() {
    if [ -z "$TOKEN" ]; then
        echo -e "${YELLOW}⚠️  TOKEN not set. Please set it first:${NC}"
        echo "   export TOKEN=\"your-jwt-token\""
        return 1
    fi

    local query=${1:-"money"}
    echo -e "${BLUE}🔍 Testing semantic search for: $query${NC}"
    curl -X POST http://localhost:8080/api/v1/emails/semantic-search \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"query\": \"$query\", \"page\": 1, \"limit\": 5}" | jq
}

# ============================================
# DATABASE CHECKS
# ============================================

check_embeddings() {
    echo -e "${BLUE}📊 Checking embeddings in database...${NC}"
    psql $DATABASE_URL -c "
        SELECT
            (SELECT COUNT(*) FROM message_bodies WHERE embedding IS NOT NULL) as with_embeddings,
            (SELECT COUNT(*) FROM message_bodies WHERE embedding IS NULL) as without_embeddings,
            (SELECT COUNT(*) FROM email_messages) as total_emails;
    "
}

check_pgvector() {
    echo -e "${BLUE}🔍 Checking pgvector setup...${NC}"
    psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
    psql $DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE tablename = 'message_bodies' AND indexname LIKE '%embedding%';"
}

# ============================================
# COMPLETE WORKFLOWS
# ============================================

full_setup() {
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}   Running Full Setup${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

    reset_db
    setup_pgvector

    echo -e "\n${GREEN}✅ Setup complete!${NC}"
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Run: start_ai (in terminal 1)"
    echo "  2. Run: start_backend (in terminal 2)"
    echo "  3. Wait for email sync"
    echo "  4. Run: backfill (optional)"
    echo "  5. Run: test_semantic_search \"money\""
}

# ============================================
# HELP
# ============================================

show_help() {
    echo -e "${BLUE}Available commands:${NC}\n"

    echo -e "${GREEN}Setup:${NC}"
    echo "  reset_db              - Reset database"
    echo "  setup_pgvector        - Enable pgvector & create indexes"
    echo "  full_setup            - Run complete setup (reset + pgvector)"

    echo -e "\n${GREEN}Start Services:${NC}"
    echo "  start_ai              - Start AI service (port 8000)"
    echo "  start_backend         - Start backend (port 8080)"

    echo -e "\n${GREEN}Backfill & Test:${NC}"
    echo "  backfill [limit]      - Generate embeddings (default: 100)"
    echo "  test_ai_service       - Test AI service endpoint"
    echo "  test_semantic_search [query] - Test search (default: 'money')"

    echo -e "\n${GREEN}Database Checks:${NC}"
    echo "  check_embeddings      - Check embedding counts"
    echo "  check_pgvector        - Verify pgvector setup"

    echo -e "\n${BLUE}Examples:${NC}"
    echo "  backfill 50"
    echo "  test_semantic_search \"urgent meeting\""
    echo "  test_semantic_search \"vacation\""

    echo -e "\n${YELLOW}Quick Start:${NC}"
    echo "  1. full_setup"
    echo "  2. start_ai          # Terminal 1"
    echo "  3. start_backend     # Terminal 2"
    echo "  4. backfill 100      # Terminal 3"
    echo "  5. export TOKEN=\"...\""
    echo "  6. test_semantic_search \"money\""
}

# Show help on load
echo -e "${GREEN}Commands loaded! Type 'show_help' to see all available commands.${NC}\n"
