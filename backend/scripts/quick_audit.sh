#!/bin/bash

# ╔════════════════════════════════════════════════════════════════╗
# ║  SALES FLOW AI - QUICK DATABASE AUDIT                         ║
# ║  Runs complete audit and shows results                        ║
# ╚════════════════════════════════════════════════════════════════╝

set -e

echo "🔍 SALES FLOW AI - Database Audit Starting..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable not set!"
    echo ""
    echo "Please set it first:"
    echo "  export DATABASE_URL='postgresql://user:pass@host:5432/dbname'"
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Check if asyncpg is installed
echo "📦 Checking Python dependencies..."
python -c "import asyncpg" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  asyncpg not installed. Installing now..."
    pip install asyncpg
    echo "✅ asyncpg installed"
else
    echo "✅ asyncpg is installed"
fi
echo ""

# Run Python audit
echo "🔍 Running database audit..."
python backend/scripts/audit_database.py

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ AUDIT COMPLETE!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📄 Results saved to:"
echo "  - backend/database/audit_results.json"
echo "  - backend/database/auto_migration.sql"
echo ""
echo "🔧 To apply migrations:"
echo "  psql \$DATABASE_URL < backend/database/complete_system_migration.sql"
echo ""

