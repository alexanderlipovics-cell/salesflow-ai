"""
Sales Flow AI - Development Server Runner
Startet das Backend mit Hot-Reload.
"""

import uvicorn

if __name__ == "__main__":
    print("🚀 Starting Sales Flow AI Backend...")
    print("📍 Server: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    print("-" * 40)
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

