#!/usr/bin/env python3
"""
MASTER IMPORT SCRIPT - Sales Flow AI
Orchestrates all data imports in correct order
- Safe & idempotent (skips existing data)
- Progress tracking
- Error handling
- Summary report
"""

import sys
import os
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Color codes for terminal output (Windows compatible)
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    """Print styled header"""
    print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*70}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.HEADER}{text}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.HEADER}{'='*70}{Colors.ENDC}\n")

def print_step(number, title):
    """Print step header"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}[{number}/4] {title}{Colors.ENDC}")
    print(f"{Colors.CYAN}{'-'*70}{Colors.ENDC}")

def print_success(text):
    """Print success message"""
    print(f"{Colors.GREEN}✅ {text}{Colors.ENDC}")

def print_warning(text):
    """Print warning message"""
    print(f"{Colors.WARNING}⚠️  {text}{Colors.ENDC}")

def print_error(text):
    """Print error message"""
    print(f"{Colors.FAIL}❌ {text}{Colors.ENDC}")

def run_import_script(script_name, description):
    """
    Run an import script and capture results
    
    Args:
        script_name: Name of the Python script to run
        description: Human-readable description
        
    Returns:
        dict with success status and message
    """
    script_path = Path(__file__).parent / script_name
    
    if not script_path.exists():
        return {
            'success': False,
            'skipped': True,
            'message': f"Script not found: {script_name}"
        }
    
    try:
        # Import and run the script
        import importlib.util
        spec = importlib.util.spec_from_file_location(script_name, script_path)
        module = importlib.util.module_from_spec(spec)
        
        # Capture stdout
        import io
        from contextlib import redirect_stdout
        
        output_capture = io.StringIO()
        
        with redirect_stdout(output_capture):
            spec.loader.exec_module(module)
        
        output = output_capture.getvalue()
        
        # Parse output for summary
        imported_count = 0
        skipped_count = 0
        
        for line in output.split('\n'):
            if 'Imported:' in line or 'New:' in line:
                try:
                    # Extract number from "✅ Imported: X" or "✅ New: X"
                    parts = line.split(':')
                    if len(parts) > 1:
                        num_str = parts[1].strip().split()[0]
                        imported_count += int(num_str)
                except:
                    pass
            elif 'Skipped:' in line:
                try:
                    parts = line.split(':')
                    if len(parts) > 1:
                        num_str = parts[1].strip().split()[0]
                        skipped_count += int(num_str)
                except:
                    pass
        
        return {
            'success': True,
            'skipped': False,
            'imported': imported_count,
            'skipped_items': skipped_count,
            'message': f"Imported: {imported_count}, Skipped: {skipped_count}"
        }
        
    except Exception as e:
        return {
            'success': False,
            'skipped': False,
            'message': f"Error: {str(e)}"
        }

def main():
    """Main import orchestration"""
    
    print_header("🚀 SALES FLOW AI - MASTER DATA IMPORT")
    
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Working directory: {Path.cwd()}")
    
    # Track results
    results = {}
    total_imported = 0
    total_skipped = 0
    total_errors = 0
    
    # ========================================================================
    # STEP 1: Import Objections
    # ========================================================================
    print_step(1, "OBJECTIONS - Import knowledge base")
    
    result = run_import_script('import_objections.py', 'Objections')
    results['objections'] = result
    
    if result['skipped']:
        print_warning(result['message'])
    elif result['success']:
        print_success(result['message'])
        total_imported += result['imported']
        total_skipped += result['skipped_items']
    else:
        print_error(result['message'])
        total_errors += 1
    
    # ========================================================================
    # STEP 2: Import Message Templates
    # ========================================================================
    print_step(2, "MESSAGE TEMPLATES - Import email/DM templates")
    
    result = run_import_script('import_templates.py', 'Templates')
    results['templates'] = result
    
    if result['skipped']:
        print_warning(result['message'])
    elif result['success']:
        print_success(result['message'])
        total_imported += result['imported']
        total_skipped += result['skipped_items']
    else:
        print_error(result['message'])
        total_errors += 1
    
    # ========================================================================
    # STEP 3: Import Playbooks
    # ========================================================================
    print_step(3, "PLAYBOOKS - Import sales playbooks")
    
    result = run_import_script('import_playbooks.py', 'Playbooks')
    results['playbooks'] = result
    
    if result['skipped']:
        print_warning(result['message'])
    elif result['success']:
        print_success(result['message'])
        total_imported += result['imported']
        total_skipped += result['skipped_items']
    else:
        print_error(result['message'])
        total_errors += 1
    
    # ========================================================================
    # STEP 4: Import Sequences
    # ========================================================================
    print_step(4, "SEQUENCES - Import multi-touch campaigns")
    
    # Special handling for sequences (needs data file path)
    sequences_data_path = Path(__file__).parent.parent / 'data' / 'sequences_definitions.json'
    
    if sequences_data_path.exists():
        result = run_import_script('import_sequences.py', 'Sequences')
        results['sequences'] = result
        
        if result['skipped']:
            print_warning(result['message'])
        elif result['success']:
            print_success(result['message'])
            total_imported += result['imported']
            total_skipped += result['skipped_items']
        else:
            print_error(result['message'])
            total_errors += 1
    else:
        print_warning(f"Sequences data file not found: {sequences_data_path}")
        results['sequences'] = {'success': False, 'skipped': True}
    
    # ========================================================================
    # FINAL SUMMARY
    # ========================================================================
    print_header("📊 IMPORT SUMMARY")
    
    print(f"{'Component':<20} {'Status':<15} {'Details'}")
    print(f"{'-'*70}")
    
    for name, result in results.items():
        status = "✅ Success" if result['success'] else ("⏭️  Skipped" if result['skipped'] else "❌ Failed")
        details = result.get('message', 'No details')
        print(f"{name.title():<20} {status:<15} {details}")
    
    print(f"\n{Colors.BOLD}TOTALS:{Colors.ENDC}")
    print(f"  ✅ Total Imported:  {total_imported}")
    print(f"  ⏭️  Total Skipped:   {total_skipped}")
    print(f"  ❌ Total Errors:    {total_errors}")
    
    # Success/Failure status
    all_success = all(r['success'] or r['skipped'] for r in results.values())
    
    if all_success:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 ALL IMPORTS COMPLETED SUCCESSFULLY!{Colors.ENDC}")
        
        # Next steps
        print(f"\n{Colors.BOLD}🚀 NEXT STEPS:{Colors.ENDC}")
        print("  1. Verify data in Supabase UI")
        print("  2. Test APIs: http://localhost:8000/docs")
        print("  3. Create test revenue data: python scripts/create_revenue_test_data.py")
        print("  4. Test frontend integration")
        
        return True
    else:
        print(f"\n{Colors.WARNING}{Colors.BOLD}⚠️  IMPORTS COMPLETED WITH ISSUES{Colors.ENDC}")
        print(f"  Check errors above and retry failed imports individually.")
        
        return False

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n\n{Colors.WARNING}⚠️  Import cancelled by user{Colors.ENDC}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.FAIL}❌ Fatal error: {str(e)}{Colors.ENDC}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
