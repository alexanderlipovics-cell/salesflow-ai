#!/usr/bin/env python3
"""
Add onboarding columns to users table.
Run this script to add the required columns for CHIEF onboarding.
"""

import os
import sys
sys.path.append('.')

from app.core.supabase import supabase

def add_onboarding_columns():
    """Add onboarding_completed and onboarding_data columns to users table."""

    try:
        # Check if columns exist by trying to select them
        test_query = supabase.table("users").select("onboarding_completed, onboarding_data").limit(1).execute()
        print("✅ Onboarding columns already exist")
        return True
    except Exception as e:
        print(f"❌ Columns might not exist: {e}")
        print("🔧 Adding onboarding columns...")

        # Try to add the columns using raw SQL (this might not work in all Supabase setups)
        try:
            # Note: This approach might not work with Supabase directly.
            # It's better to run the SQL script manually in Supabase dashboard.
            print("⚠️  Please run the following SQL in your Supabase SQL Editor:")
            print()
            print("ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;")
            print("ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}';")
            print()
            return False
        except Exception as e:
            print(f"❌ Error adding columns: {e}")
            return False

if __name__ == "__main__":
    success = add_onboarding_columns()
    if success:
        print("🎉 Onboarding columns are ready!")
    else:
        print("📋 Please add the columns manually using the SQL commands above.")
