# Playwright Testing Standards for ReactJS Applications

## Overview
When testing our React application with Playwright, we implement explicit instrumentation to eliminate flaky tests caused by dynamic content loading. Instead of using arbitrary timeouts or polling, our application explicitly signals when it's ready for interaction.

## Core Principles

1. **No arbitrary timeouts** - Use deterministic signals from the application
2. **Explicit over implicit** - The app tells tests when it's ready, tests don't guess
3. **Test-specific attributes** - Use data-testid and data-* attributes for test selectors
4. **Fail fast** - Clear signals help identify real issues vs timing problems

## Implementation Standards

### 1. Test Identifiers
All interactive and testable elements must include semantic test identifiers:

```jsx
// ✅ Good - Semantic, stable identifier
<button data-testid="submit-form">Submit</button>
<div data-testid="user-profile-card">...</div>

// ❌ Avoid - Using classes or IDs meant for styling
<button className="btn-primary">Submit</button>
```

### 2. Loading State Instrumentation
Components that load data must expose their loading state via data attributes:

```jsx
function UserList() {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div 
      data-testid="user-list" 
      data-loaded={!isLoading}
    >
      {isLoading ? <Spinner /> : <UserCards users={users} />}
    </div>
  );
}

// Playwright test waits for:
await page.waitForSelector('[data-testid="user-list"][data-loaded="true"]');
```

### 3. Global Application Ready State
Implement a global ready state that tracks all pending operations:

```jsx
// appState.js
class AppState {
  constructor() {
    this.pendingOperations = new Set();
  }

  async trackOperation(promise) {
    const id = Math.random();
    this.pendingOperations.add(id);
    
    try {
      return await promise;
    } finally {
      this.pendingOperations.delete(id);
      this.updateReadyState();
    }
  }

  updateReadyState() {
    const isReady = this.pendingOperations.size === 0;
    document.body.setAttribute('data-app-ready', isReady);
    
    if (window.__testMode) {
      window.__appReady = isReady;
    }
  }
}

export const appState = new AppState();

// In API calls:
const users = await appState.trackOperation(api.fetchUsers());

// In Playwright:
await page.waitForSelector('body[data-app-ready="true"]');
```

### 4. React Suspense Integration
Leverage React Suspense boundaries for automatic loading state management:

```jsx
function App() {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <UserDashboard />
    </Suspense>
  );
}

function LoadingIndicator() {
  return <div data-testid="app-loading" />;
}

// Playwright test:
await page.waitForSelector('[data-testid="app-loading"]', { state: 'detached' });
```

### 5. Custom Event Dispatching
Emit custom events for complex state transitions:

```jsx
function DataTable({ onDataLoad }) {
  useEffect(() => {
    fetchTableData().then(data => {
      setTableData(data);
      
      // Dispatch custom event for tests
      window.dispatchEvent(new CustomEvent('app:table-loaded', {
        detail: { rowCount: data.length }
      }));
    });
  }, []);
}

// Playwright test:
await page.evaluate(() => 
  new Promise(resolve => 
    window.addEventListener('app:table-loaded', resolve, { once: true })
  )
);
```

### 6. Network Request Tracking
Track all network requests to know when the app is truly idle:

```jsx
// networkTracker.js
let activeRequests = 0;

// Intercept fetch
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  activeRequests++;
  document.body.setAttribute('data-network-active', 'true');
  
  try {
    return await originalFetch(...args);
  } finally {
    activeRequests--;
    if (activeRequests === 0) {
      document.body.setAttribute('data-network-active', 'false');
    }
  }
};

// Playwright test:
await page.waitForSelector('body[data-network-active="false"]');
```

### 7. Environment-Specific Instrumentation
Only include test instrumentation in appropriate environments:

```jsx
// App.jsx
if (process.env.REACT_APP_ENABLE_TEST_MODE === 'true') {
  window.__testMode = true;
  window.__testHelpers = {
    waitForRender: () => document.body.setAttribute('data-render-complete', 'true'),
    getPendingRequests: () => appState.pendingOperations.size,
    // Additional test-specific helpers
  };
}
```

## Playwright Test Patterns

### Standard Test Structure
```javascript
// user.spec.js
import { test, expect } from '@playwright/test';
import { waitForAppReady, waitForDataLoad } from './helpers';

test('user can view profile', async ({ page }) => {
  await page.goto('/profile');
  
  // Wait for app initialization
  await waitForAppReady(page);
  
  // Interact with elements using data-testid
  await page.click('[data-testid="edit-profile"]');
  
  // Wait for specific component data
  await waitForDataLoad(page, 'profile-form');
  
  // Continue with assertions
  await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
});
```

### Helper Functions
Create a shared helper file for common wait patterns:

```javascript
// test-helpers.js
export async function waitForAppReady(page) {
  await page.waitForSelector('body[data-app-ready="true"]', {
    timeout: 30000
  });
}

export async function waitForDataLoad(page, testId) {
  await page.waitForSelector(`[data-testid="${testId}"][data-loaded="true"]`);
}

export async function waitForNetworkIdle(page) {
  await page.waitForSelector('body[data-network-active="false"]');
}
```

## Checklist for Developers

When implementing a new feature:

- [ ] Add `data-testid` to all interactive elements
- [ ] Include `data-loaded` attribute on components that fetch data
- [ ] Wrap async operations with `appState.trackOperation()`
- [ ] Dispatch custom events for complex state changes
- [ ] Use Suspense boundaries where appropriate
- [ ] Document any special test requirements in component comments
- [ ] Test the feature with Playwright locally before pushing

## Anti-Patterns to Avoid

❌ **Don't use arbitrary waits:**
```javascript
await page.waitForTimeout(3000); // Never do this
```

❌ **Don't rely on CSS animations for readiness:**
```javascript
await page.waitForSelector('.fade-in-complete'); // Fragile
```

❌ **Don't use production IDs/classes for tests:**
```javascript
await page.click('#user-123'); // IDs might change
await page.click('.btn-primary'); // Classes are for styling
```

## Benefits

- **Faster tests** - No unnecessary waiting
- **Reliable tests** - Deterministic signals eliminate flakiness
- **Better debugging** - Clear signals show exactly what the test is waiting for
- **Maintainable** - Semantic test IDs make tests self-documenting

By following these standards, our Playwright tests become reliable, fast, and maintainable, turning our test suite from a source of frustration into a trusted guardian of application quality.