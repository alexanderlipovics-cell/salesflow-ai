#!/bin/bash

# ╔════════════════════════════════════════════════════════════════╗
# ║  SALES FLOW AI - APPLY DATABASE MIGRATION                     ║
# ║  Applies complete system migration to database                ║
# ╚════════════════════════════════════════════════════════════════╝

set -e

echo "🚀 SALES FLOW AI - Database Migration"
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

# Confirm
echo "⚠️  WARNING: This will apply migrations to your database!"
echo ""
echo "This will create:"
echo "  - Email Integration tables"
echo "  - Import/Export tables"
echo "  - Gamification tables"
echo "  - Video Conferencing tables"
echo "  - Lead Enrichment tables"
echo "  - All functions & triggers"
echo "  - Materialized views"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled"
    exit 1
fi

echo ""
echo "📝 Applying migration..."
echo ""

# Apply migration
psql "$DATABASE_URL" < backend/database/complete_system_migration.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo "✅ MIGRATION SUCCESSFUL!"
    echo "════════════════════════════════════════════════════════════"
    echo ""
    echo "🔍 Running audit to verify..."
    python backend/scripts/audit_database.py
else
    echo ""
    echo "❌ MIGRATION FAILED!"
    echo "Check the error messages above."
    exit 1
fi

