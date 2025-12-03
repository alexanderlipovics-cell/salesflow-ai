"""
Fix JSON syntax errors in NM data files
Fixes common issues like unquoted numbers with text
"""
import re
import sys
from pathlib import Path

def fix_json_file(file_path):
    """Fix common JSON syntax errors"""
    print(f"🔧 Fixing {file_path.name}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    fixes = 0
    
    # Fix 1: "founded": 2016 (text)" → "founded": "2016 (text)"
    pattern = r'"founded":\s*(\d{4})\s+\(([^)]+)\)"'
    matches = re.findall(pattern, content)
    if matches:
        for year, text in matches:
            old = f'"founded": {year} ({text})"'
            new = f'"founded": "{year} ({text})"'
            content = content.replace(old, new)
            fixes += 1
            print(f"  ✅ Fixed: {old} → {new}")
    
    # Fix 2: Other similar patterns
    # Add more patterns as needed
    
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ {file_path.name}: {fixes} fixes applied!")
        return fixes
    else:
        print(f"ℹ️  {file_path.name}: No fixes needed")
        return 0

def main():
    data_dir = Path(__file__).parent.parent / 'data'
    
    files = [
        data_dir / 'nm_companies.json',
        data_dir / 'nm_objections.json',
        data_dir / 'nm_templates.json'
    ]
    
    total_fixes = 0
    for file_path in files:
        if file_path.exists():
            total_fixes += fix_json_file(file_path)
        else:
            print(f"⚠️  {file_path.name} not found, skipping")
    
    print(f"\n🎉 Total fixes applied: {total_fixes}")

if __name__ == "__main__":
    main()

