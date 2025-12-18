# 🧪 URGENT: TESTING FRAMEWORK IMPLEMENTIEREN

## 🎯 MISSION: Vollständiges Testing für SalesFlow AI in 4-5 Stunden

### 🔥 TESTING STACK:
- **Web-App:** Jest + React Testing Library + Vitest
- **Mobile:** Detox (E2E) + Jest (Unit)
- **Backend:** Pytest (bereits vorhanden, erweitern)
- **Integration:** Playwright für E2E Flows

### 📋 TESTING SETUP SCHRITT-FÜR-SCHRITT:

#### 1. **WEB-APP TESTING FRAMEWORK** (1.5 Stunden)
```bash
# 1. Dependencies installieren
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event @testing-library/dom
npm install --save-dev jsdom vitest @vitest/ui

# 2. Vitest Config
// vite.config.ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

afterEach(() => {
  cleanup()
})
```

#### 2. **AUTH COMPONENT TESTS** (1 Stunde)
```typescript
// src/components/auth/__tests__/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginForm } from '../LoginForm'
import { vi } from 'vitest'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

describe('LoginForm', () => {
  it('renders login form', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('handles successful login', async () => {
    // Mock Supabase auth
    const mockSignIn = vi.fn().mockResolvedValue({ user: { id: '1' } })
    vi.mocked(supabase.auth.signInWithPassword).mockImplementation(mockSignIn)

    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    })

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows error for invalid credentials', async () => {
    const mockSignIn = vi.fn().mockRejectedValue(new Error('Invalid credentials'))
    vi.mocked(supabase.auth.signInWithPassword).mockImplementation(mockSignIn)

    render(<LoginForm />)

    // Fill form and submit
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'wrong@example.com' }
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' }
    })

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })
})
```

#### 3. **LEAD MANAGEMENT TESTS** (1 Stunde)
```typescript
// src/hooks/__tests__/useLeads.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLeads } from '../useLeads'
import { vi } from 'vitest'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useLeads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches leads successfully', async () => {
    const mockLeads = [
      { id: '1', name: 'Test Lead', email: 'test@example.com' }
    ]

    // Mock API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockLeads, success: true })
    })

    const { result } = renderHook(() => useLeads(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.data).toEqual(mockLeads)
      expect(result.current.isSuccess).toBe(true)
    })
  })

  it('handles API errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'API Error' })
    })

    const { result } = renderHook(() => useLeads(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.error).toBeDefined()
      expect(result.current.isError).toBe(true)
    })
  })
})
```

#### 4. **MOBILE E2E TESTS** (1 Stunde)
```typescript
// mobile/e2e/LoginFlow.test.ts
import { device, element, by, waitFor } from 'detox'

describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp()
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  it('should login successfully', async () => {
    await element(by.id('email-input')).typeText('test@example.com')
    await element(by.id('password-input')).typeText('password123')
    await element(by.id('login-button')).tap()

    await waitFor(element(by.id('dashboard-screen')))
      .toBeVisible()
      .withTimeout(5000)
  })

  it('should show error for invalid credentials', async () => {
    await element(by.id('email-input')).typeText('wrong@example.com')
    await element(by.id('password-input')).typeText('wrongpassword')
    await element(by.id('login-button')).tap()

    await waitFor(element(by.text('Invalid credentials')))
      .toBeVisible()
      .withTimeout(5000)
  })
})
```

#### 5. **INTEGRATION TESTS** (1 Stunde)
```typescript
// tests/integration/AuthFlow.test.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('complete login flow', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login')

    // Fill login form
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')

    // Submit form
    await page.click('[data-testid="login-button"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible()
  })

  test('lead creation flow', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')

    // Navigate to leads
    await page.click('[data-testid="leads-nav"]')

    // Create new lead
    await page.click('[data-testid="add-lead-button"]')
    await page.fill('[data-testid="lead-name"]', 'Test Lead')
    await page.fill('[data-testid="lead-email"]', 'lead@example.com')
    await page.click('[data-testid="save-lead"]')

    // Verify lead appears in list
    await expect(page.locator('[data-testid="lead-item"]').filter({
      hasText: 'Test Lead'
    })).toBeVisible()
  })
})
```

### 📋 DELIVERABLES (4-5 Stunden):

1. **✅ Jest + RTL Setup** - Web-App Testing Framework
2. **✅ 50+ Unit Tests** - Components & Hooks
3. **✅ Detox E2E Setup** - Mobile Testing
4. **✅ Playwright Integration** - Cross-browser E2E
5. **✅ CI/CD Pipeline** - GitHub Actions mit Tests
6. **✅ Test Coverage** - >80% Coverage Target

### 🧪 TEST COVERAGE ZIELE:

- **Auth Flow:** Login, Signup, Password Reset ✅
- **Lead Management:** CRUD Operations ✅
- **Dashboard:** Stats, Offline Mode ✅
- **Mobile:** Biometric Auth, Push Notifications ✅
- **API Integration:** Error Handling, Loading States ✅

### 📊 TESTING PYRAMID:
```
E2E Tests (10)     ████████░░ 20%
Integration (25)   ██████████ 30%
Unit Tests (100+)  ██████████ 50%
```

**Zeitbudget:** 4-5 Stunden MAXIMUM
**Priorität:** HIGH - BLOCKING DEPLOYMENT

**GO!** 🧪
