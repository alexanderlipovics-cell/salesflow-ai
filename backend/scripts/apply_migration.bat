@echo off
REM ╔════════════════════════════════════════════════════════════════╗
REM ║  SALES FLOW AI - APPLY DATABASE MIGRATION (Windows)           ║
REM ║  Applies complete system migration to database                ║
REM ╚════════════════════════════════════════════════════════════════╝

echo 🚀 SALES FLOW AI - Database Migration
echo.

REM Check if DATABASE_URL is set
if "%DATABASE_URL%"=="" (
    echo ❌ ERROR: DATABASE_URL environment variable not set!
    echo.
    echo Please set it first:
    echo   set DATABASE_URL=postgresql://user:pass@host:5432/dbname
    exit /b 1
)

echo ✅ DATABASE_URL is set
echo.

REM Confirm
echo ⚠️  WARNING: This will apply migrations to your database!
echo.
echo This will create:
echo   - Email Integration tables
echo   - Import/Export tables
echo   - Gamification tables
echo   - Video Conferencing tables
echo   - Lead Enrichment tables
echo   - All functions ^& triggers
echo   - Materialized views
echo.
set /p confirm="Continue? (y/n): "

if /i not "%confirm%"=="y" (
    echo ❌ Migration cancelled
    exit /b 1
)

echo.
echo 📝 Applying migration...
echo.

REM Apply migration
psql "%DATABASE_URL%" < backend\database\complete_system_migration.sql

if %errorlevel% equ 0 (
    echo.
    echo ════════════════════════════════════════════════════════════
    echo ✅ MIGRATION SUCCESSFUL!
    echo ════════════════════════════════════════════════════════════
    echo.
    echo 🔍 Running audit to verify...
    python backend\scripts\audit_database.py
) else (
    echo.
    echo ❌ MIGRATION FAILED!
    echo Check the error messages above.
    exit /b 1
)

pause

