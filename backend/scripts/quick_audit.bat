@echo off
REM ╔════════════════════════════════════════════════════════════════╗
REM ║  SALES FLOW AI - QUICK DATABASE AUDIT (Windows)               ║
REM ║  Runs complete audit and shows results                        ║
REM ╚════════════════════════════════════════════════════════════════╝

echo 🔍 SALES FLOW AI - Database Audit Starting...
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

REM Check if asyncpg is installed
echo 📦 Checking Python dependencies...
python -c "import asyncpg" 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  asyncpg not installed. Installing now...
    pip install asyncpg
    echo ✅ asyncpg installed
) else (
    echo ✅ asyncpg is installed
)
echo.

REM Run Python audit
echo 🔍 Running database audit...
python backend\scripts\audit_database.py

echo.
echo ════════════════════════════════════════════════════════════
echo ✅ AUDIT COMPLETE!
echo ════════════════════════════════════════════════════════════
echo.
echo 📄 Results saved to:
echo   - backend\database\audit_results.json
echo   - backend\database\auto_migration.sql
echo.
echo 🔧 To apply migrations:
echo   psql %DATABASE_URL% ^< backend\database\complete_system_migration.sql
echo.
pause

