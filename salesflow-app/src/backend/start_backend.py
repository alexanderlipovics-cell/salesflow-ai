#!/usr/bin/env python3
"""
Backend Start Script - Umgeht ModuleNotFoundError
Führt uvicorn mit korrektem PYTHONPATH aus
"""

import os
import sys
import subprocess

# WICHTIG: Stelle sicher, dass wir im richtigen Verzeichnis sind
backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)

# Prüfe ob app/main.py existiert
if not os.path.exists('app/main.py'):
    print(f"❌ Fehler: app/main.py nicht gefunden in {backend_dir}")
    sys.exit(1)

# Setze PYTHONPATH
env = os.environ.copy()
env['PYTHONPATH'] = backend_dir

# Starte uvicorn
print("🚀 Starte Backend...")
print(f"📂 Verzeichnis: {backend_dir}")
print(f"✅ app/main.py gefunden")
print("")
print("🌐 Backend läuft auf: http://127.0.0.1:8000")
print("📚 Docs: http://127.0.0.1:8000/docs")
print("")

try:
    subprocess.run([
        sys.executable, '-m', 'uvicorn',
        'app.main:app',
        '--reload',
        '--host', '0.0.0.0',
        '--port', '8000'
    ], env=env, cwd=backend_dir)
except KeyboardInterrupt:
    print("\n✅ Backend gestoppt")
except Exception as e:
    print(f"❌ Fehler: {e}")
    sys.exit(1)

