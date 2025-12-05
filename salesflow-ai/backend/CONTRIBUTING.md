# 🤝 Contributing to SalesFlow AI Backend

Vielen Dank für dein Interesse an SalesFlow AI! Wir freuen uns über jeden Beitrag zur Verbesserung des Projekts.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Bug Reports](#bug-reports)
- [Feature Requests](#feature-requests)

---

## 📜 Code of Conduct

### Unsere Werte

- **Respektvoll:** Behandle alle Contributors mit Respekt
- **Konstruktiv:** Gib konstruktives Feedback
- **Offen:** Sei offen für neue Ideen
- **Hilfsbereit:** Hilf anderen Contributors

### Unakzeptables Verhalten

- Beleidigungen oder persönliche Angriffe
- Trolling oder provozierende Kommentare
- Veröffentlichung privater Informationen
- Andere unprofessionelle Verhaltensweisen

---

## 🚀 Getting Started

### 1. Fork das Repository

```bash
# Fork auf GitHub erstellen
# Dann klonen:
git clone https://github.com/YOUR-USERNAME/salesflow-ai.git
cd salesflow-ai/backend
```

### 2. Development Setup

```bash
# Virtual Environment erstellen
python -m venv venv

# Aktivieren (Windows)
venv\Scripts\activate

# Aktivieren (macOS/Linux)
source venv/bin/activate

# Dependencies installieren
pip install -r requirements.txt

# Development Dependencies
pip install pytest pytest-cov black flake8 mypy
```

### 3. Environment Variables

```bash
# .env erstellen (siehe .env.example)
OPENAI_API_KEY=sk-proj-test-key
SUPABASE_URL=https://test.supabase.co
SUPABASE_SERVICE_ROLE_KEY=test-key
OPENAI_MODEL=gpt-4o-mini
```

### 4. Tests ausführen

```bash
pytest tests/
```

---

## 💻 Development Process

### Branch Strategy

```bash
main          # Production-ready code
├── develop   # Integration branch
│   ├── feature/new-endpoint
│   ├── feature/ai-improvement
│   ├── bugfix/cors-issue
│   └── hotfix/critical-bug
```

### Branch Naming Convention

- **Feature:** `feature/description-in-kebab-case`
- **Bugfix:** `bugfix/issue-number-description`
- **Hotfix:** `hotfix/critical-issue`
- **Docs:** `docs/what-changed`
- **Refactor:** `refactor/what-was-refactored`

### Commit Messages

Wir folgen den [Conventional Commits](https://www.conventionalcommits.org/) Guidelines:

```bash
# Format:
<type>(<scope>): <subject>

# Beispiele:
feat(leads): add bulk import endpoint
fix(copilot): resolve timeout issue
docs(readme): update installation steps
refactor(analytics): optimize query performance
test(chat): add integration tests
chore(deps): update fastapi to 0.115.0
```

**Types:**
- `feat`: Neue Feature
- `fix`: Bug Fix
- `docs`: Dokumentation
- `refactor`: Code Refactoring
- `test`: Tests hinzufügen/ändern
- `chore`: Build/Config Änderungen
- `perf`: Performance Verbesserung
- `style`: Code Style (Formatierung)

---

## 📏 Coding Standards

### Python Style Guide

Wir folgen [PEP 8](https://peps.python.org/pep-0008/) mit einigen Anpassungen:

```python
# ✅ Good
def calculate_lead_score(
    lead: Lead,
    context: Optional[str] = None,
    threshold: float = 0.8
) -> float:
    """
    Berechnet Lead Score basierend auf verschiedenen Faktoren.
    
    Args:
        lead: Lead Objekt
        context: Optional context string
        threshold: Score threshold (0.0-1.0)
        
    Returns:
        Score als Float zwischen 0.0 und 1.0
    """
    score = 0.0
    # Implementation...
    return score

# ❌ Bad
def calc(l,c=None,t=0.8):
    s=0.0
    # No docstring, unclear variable names
    return s
```

### Code Formatting

```bash
# Black für automatische Formatierung
black app/ tests/

# Flake8 für Linting
flake8 app/ tests/

# MyPy für Type Checking
mypy app/
```

### Type Hints

Verwende immer Type Hints:

```python
# ✅ Good
from typing import List, Optional, Dict, Any

def get_leads(
    user_id: str,
    limit: int = 10,
    offset: int = 0
) -> List[Dict[str, Any]]:
    ...

# ❌ Bad
def get_leads(user_id, limit=10, offset=0):
    ...
```

### Pydantic Models

```python
# ✅ Good
from pydantic import BaseModel, Field, validator

class LeadCreate(BaseModel):
    """Schema für Lead Creation."""
    
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., regex=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    phone: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Max Mustermann",
                "email": "max@example.com",
                "phone": "+49123456789"
            }
        }
    
    @validator('name')
    def validate_name(cls, v):
        return v.strip()
```

### API Endpoints

```python
# ✅ Good
@router.post(
    "/leads",
    response_model=LeadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new lead",
    description="Creates a new lead with validation",
    tags=["Leads"]
)
async def create_lead(
    lead: LeadCreate,
    current_user: User = Depends(get_current_user)
) -> LeadResponse:
    """
    Create a new lead.
    
    - **name**: Lead name (required)
    - **email**: Valid email address (required)
    - **phone**: Phone number (optional)
    """
    # Implementation...
    return lead_response
```

---

## 🧪 Testing

### Test Structure

```
tests/
├── __init__.py
├── conftest.py              # Pytest fixtures
├── test_leads.py            # Lead endpoint tests
├── test_copilot.py          # Copilot tests
├── test_chat.py             # Chat tests
└── test_analytics.py        # Analytics tests
```

### Writing Tests

```python
# tests/test_leads.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestLeadsEndpoint:
    """Tests für Lead Endpoints."""
    
    def test_create_lead_success(self):
        """Test successful lead creation."""
        payload = {
            "name": "Test Lead",
            "email": "test@example.com"
        }
        response = client.post("/api/leads", json=payload)
        
        assert response.status_code == 201
        assert response.json()["name"] == "Test Lead"
    
    def test_create_lead_invalid_email(self):
        """Test lead creation with invalid email."""
        payload = {
            "name": "Test Lead",
            "email": "invalid-email"
        }
        response = client.post("/api/leads", json=payload)
        
        assert response.status_code == 422
```

### Running Tests

```bash
# Alle Tests
pytest

# Mit Coverage
pytest --cov=app --cov-report=html

# Spezifische Test-Datei
pytest tests/test_leads.py

# Spezifischer Test
pytest tests/test_leads.py::TestLeadsEndpoint::test_create_lead_success

# Mit Output
pytest -v -s
```

### Test Coverage

Wir streben mindestens **80% Test Coverage** an:

```bash
pytest --cov=app --cov-report=term-missing
```

---

## 🔄 Pull Request Process

### 1. Vorbereitung

```bash
# Update deinen Fork
git checkout develop
git pull upstream develop

# Neuen Feature Branch erstellen
git checkout -b feature/my-new-feature
```

### 2. Development

```bash
# Deine Änderungen machen
# ...

# Tests schreiben/aktualisieren
# ...

# Code formatieren
black app/ tests/
flake8 app/ tests/

# Tests ausführen
pytest
```

### 3. Commit

```bash
# Staged changes
git add .

# Commit mit aussagekräftiger Message
git commit -m "feat(leads): add bulk import endpoint"
```

### 4. Push

```bash
git push origin feature/my-new-feature
```

### 5. Pull Request erstellen

1. Gehe zu GitHub
2. Klicke "Compare & pull request"
3. Wähle `develop` als Base Branch
4. Fülle PR Template aus:

```markdown
## Description
Kurze Beschreibung der Änderungen

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Manual testing done

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review done
- [ ] Comments added where needed
- [ ] Documentation updated
- [ ] No new warnings
```

### 6. Review Process

- Mindestens 1 Approval erforderlich
- Alle CI Checks müssen grün sein
- Code Review Feedback addressieren
- Nach Approval: Merge durch Maintainer

---

## 🐛 Bug Reports

### Template

```markdown
**Describe the bug**
Clear description of the bug

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What should happen

**Screenshots**
If applicable

**Environment:**
 - OS: [e.g. Windows 11]
 - Python Version: [e.g. 3.11]
 - FastAPI Version: [e.g. 0.115.0]

**Additional context**
Any other context
```

### Severity Labels

- `critical`: Production down
- `high`: Major feature broken
- `medium`: Feature partially broken
- `low`: Minor issue

---

## 💡 Feature Requests

### Template

```markdown
**Is your feature request related to a problem?**
Clear description of the problem

**Describe the solution you'd like**
What you want to happen

**Describe alternatives you've considered**
Other solutions you've thought about

**Additional context**
Mockups, examples, etc.
```

---

## 📚 Documentation

### Code Documentation

```python
def complex_function(param1: str, param2: int) -> Dict[str, Any]:
    """
    One-line summary of function.
    
    Detailed description of what the function does,
    how it works, and any important notes.
    
    Args:
        param1: Description of param1
        param2: Description of param2
        
    Returns:
        Dictionary with keys:
        - key1: Description
        - key2: Description
        
    Raises:
        ValueError: When param1 is empty
        HTTPException: When API call fails
        
    Example:
        >>> result = complex_function("test", 42)
        >>> print(result["key1"])
        "expected value"
    """
```

### API Documentation

Alle Endpoints müssen dokumentiert sein:
- Swagger/OpenAPI Beschreibungen
- Request/Response Examples
- Error Responses

---

## 🏆 Recognition

Contributors werden auf folgende Weise anerkannt:

- **README Contributors Section**
- **GitHub Contributors Graph**
- **Release Notes Mentions**
- **Quarterly Shoutouts**

---

## ❓ Questions?

- **Discord:** [Join our server](https://discord.gg/your-server)
- **Email:** developers@salesflow-ai.com
- **Discussions:** [GitHub Discussions](https://github.com/your-username/salesflow-ai/discussions)

---

## 📖 Additional Resources

- [FastAPI Best Practices](https://fastapi.tiangolo.com/tutorial/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [pytest Documentation](https://docs.pytest.org/)
- [Python Type Hints](https://docs.python.org/3/library/typing.html)

---

**Thank you for contributing to SalesFlow AI! 🎉**

