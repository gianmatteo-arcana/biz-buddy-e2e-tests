# 🎯 E2E User Story Test Framework

## IMPORTANT: Instructions for Claude Code Sessions

**This is the STANDARDIZED framework for ALL E2E user story tests. Future Claude sessions MUST follow this pattern when creating new E2E tests.**

## Quick Start for New User Stories

### 1. Create New Test from Template

```bash
# Copy the template
cp framework/UserStoryTemplate.js test-[feature-name]-story.js

# Edit the new file and update:
# - name: Your user story name
# - description: As a [user], I want to [action] so that [benefit]
# - groundTruths: Expected data that MUST appear
# - forbiddenData: Mock data that must NOT appear
```

### 2. Run the Test

```bash
# Run your new test
node test-[feature-name]-story.js

# Or add to package.json scripts:
"test:[feature]": "node test-[feature-name]-story.js"
```

## Framework Architecture

```
biz-buddy-e2e-tests/
├── framework/
│   ├── BaseUserStoryTest.js    # Base class - DO NOT MODIFY
│   └── UserStoryTemplate.js    # Template for new tests
├── test-suite.js               # Suite runner for all tests
├── test-arcana-dwell-user-story.js  # Example implementation
└── E2E_TEST_FRAMEWORK.md      # This file - framework documentation
```

## Creating a New User Story Test

### Step 1: Define Your User Story

```javascript
class NewFeatureStoryTest extends BaseUserStoryTest {
  constructor() {
    super({
      name: 'New Feature User Story',
      description: 'As a business owner, I want to view analytics so that I can track performance',
      
      groundTruths: {
        businessName: 'Arcana Dwell LLC',
        analyticsTitle: 'Business Analytics Dashboard',
        // ... all expected data
      },
      
      forbiddenData: ['mock', 'demo', 'test data', 'Sarah Chen']
    });
  }
```

### Step 2: Implement Test Flow

```javascript
async runUserStory() {
  // Navigate and setup
  await this.navigate();
  await this.captureScreenshot('01-initial');
  
  // Perform actions
  await this.click('[data-testid="analytics-button"]');
  await this.waitFor(2000);
  await this.captureScreenshot('02-analytics-open');
  
  // Validate results
  await this.validate('Analytics dashboard visible', 
    await this.elementExists('.analytics-dashboard'));
  
  // Check ground truths
  const pageText = await this.getPageText();
  await this.validate('Business name shown', 
    pageText.includes(this.config.groundTruths.businessName));
}
```

### Step 3: Add to Test Suite

Edit `test-suite.js` to include your new test:

```javascript
this.tests = [
  {
    name: 'Arcana Dwell User Story',
    description: 'Validates ground truths and resilient architecture',
    runner: () => new ArcanaDwellE2ETest(true).run()
  },
  {
    name: 'New Feature Story',  // ADD YOUR TEST HERE
    description: 'Validates new feature functionality',
    runner: () => new NewFeatureStoryTest().run()
  }
];
```

## Base Class API Reference

### Core Methods

| Method | Description | Example |
|--------|-------------|---------|
| `validate(name, condition, errorMsg)` | Validate a condition | `await this.validate('Login works', isLoggedIn)` |
| `captureScreenshot(name)` | Take a screenshot | `await this.captureScreenshot('01-home')` |
| `click(selector)` | Click an element | `await this.click('#submit-button')` |
| `type(selector, text)` | Type into input | `await this.type('#email', 'test@example.com')` |
| `navigate(url)` | Navigate to URL | `await this.navigate('/dashboard')` |
| `waitFor(ms)` | Wait for milliseconds | `await this.waitFor(2000)` |
| `waitForElement(selector)` | Wait for element | `await this.waitForElement('.loaded')` |
| `getPageText()` | Get all page text | `const text = await this.getPageText()` |
| `elementExists(selector)` | Check if element exists | `if (await this.elementExists('#modal'))` |

### Validation Helpers

```javascript
// Validate text is present
await this.validateText('Header text', 'h1', 'Expected Header');

// Validate text is NOT present (for mock data)
await this.validateNotPresent('No mock data', 'Sarah Chen');

// Validate multiple conditions at once
await this.validateMultiple({
  'Header exists': await this.elementExists('header'),
  'Footer exists': await this.elementExists('footer'),
  'No errors': !pageText.includes('Error')
});
```

## Test Output Structure

Every test generates:

```
/Users/gianmatteo/Documents/Arcana-Prototype/tests/
└── [test-name]-[timestamp]/
    ├── 001-screenshot-name.png    # Sequential screenshots
    ├── 002-screenshot-name.png
    ├── test-results.json          # Detailed JSON results
    └── report.html                # Visual HTML report
```

## HTML Report Features

The generated HTML report includes:

- **Header**: Test name, description, timestamp
- **Metrics**: Pass rate, passed/failed counts, duration
- **Passed Tests**: Green list of all passing validations
- **Failed Tests**: Red list with error messages
- **Screenshots Gallery**: Clickable thumbnails of all captures
- **Footer**: Test location and metadata

## Best Practices

### 1. User Story Format

Always define user stories in the standard format:
```
As a [type of user]
I want to [perform some action]
So that [I achieve some benefit]
```

### 2. Ground Truths

Define ALL expected data that should appear:
```javascript
groundTruths: {
  businessName: 'Arcana Dwell LLC',
  ein: '84-2455935',
  address: '2512 Mission St',
  // Be comprehensive!
}
```

### 3. Forbidden Data

List ALL mock/test data that should NOT appear:
```javascript
forbiddenData: [
  'mock', 'demo', 'test',
  'Sarah Chen',  // Old mock data
  'TechStartup', // Old mock company
  'Lorem ipsum', // Placeholder text
]
```

### 4. Screenshot Strategy

Capture screenshots at key moments:
- Initial state
- After each major action
- Before validations
- Error states
- Final state

### 5. Validation Coverage

Validate:
- ✅ All ground truths appear
- ✅ No forbidden data appears
- ✅ UI elements exist
- ✅ User flows complete
- ✅ Error handling works

## Adding to CI/CD

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:suite
      - uses: actions/upload-artifact@v2
        if: always()
        with:
          name: test-results
          path: tests/
```

## Troubleshooting

### Common Issues

1. **Test can't find element**
   ```javascript
   // Add wait before interaction
   await this.waitForElement('#my-element');
   await this.click('#my-element');
   ```

2. **Screenshots missing**
   ```javascript
   // Ensure directory exists
   await fs.mkdir(this.outputDir, { recursive: true });
   ```

3. **Playwright vs Puppeteer issues**
   ```javascript
   // Framework handles both - just set in config
   usePlaywright: true  // or false for Puppeteer
   ```

## Examples of Well-Structured Tests

### Example 1: Login Flow

```javascript
class LoginFlowTest extends BaseUserStoryTest {
  constructor() {
    super({
      name: 'User Login Flow',
      description: 'As a user, I want to login so that I can access my dashboard',
      groundTruths: {
        loginButton: 'Sign In',
        dashboard: 'Welcome to your dashboard',
        userName: 'Gianmatteo Costanza'
      },
      forbiddenData: ['Invalid credentials', 'Error', 'mock']
    });
  }
  
  async runUserStory() {
    await this.navigate('/login');
    await this.captureScreenshot('01-login-page');
    
    await this.type('#email', 'user@example.com');
    await this.type('#password', 'password');
    await this.captureScreenshot('02-credentials-entered');
    
    await this.click('#login-button');
    await this.waitFor(2000);
    await this.captureScreenshot('03-after-login');
    
    const pageText = await this.getPageText();
    await this.validate('Dashboard loaded', 
      pageText.includes(this.config.groundTruths.dashboard));
    await this.validate('User name shown', 
      pageText.includes(this.config.groundTruths.userName));
  }
}
```

### Example 2: Task Creation

```javascript
class TaskCreationTest extends BaseUserStoryTest {
  constructor() {
    super({
      name: 'Task Creation Flow',
      description: 'As a user, I want to create tasks so that I can track my work',
      groundTruths: {
        taskTitle: 'File Q4 Taxes',
        taskDescription: 'Prepare and file quarterly tax returns',
        successMessage: 'Task created successfully'
      },
      forbiddenData: ['mock task', 'test task', 'demo']
    });
  }
  
  async runUserStory() {
    await this.navigate('/tasks');
    await this.captureScreenshot('01-tasks-page');
    
    await this.click('[data-testid="create-task"]');
    await this.waitForElement('#task-modal');
    await this.captureScreenshot('02-task-modal');
    
    await this.type('#task-title', this.config.groundTruths.taskTitle);
    await this.type('#task-description', this.config.groundTruths.taskDescription);
    await this.captureScreenshot('03-task-filled');
    
    await this.click('#save-task');
    await this.waitFor(2000);
    await this.captureScreenshot('04-task-saved');
    
    const pageText = await this.getPageText();
    await this.validate('Task created', 
      pageText.includes(this.config.groundTruths.successMessage));
    await this.validate('Task visible in list', 
      pageText.includes(this.config.groundTruths.taskTitle));
  }
}
```

## MANDATORY for Claude Sessions

When asked to create E2E tests, Claude MUST:

1. **Use the BaseUserStoryTest framework** - Never create standalone test files
2. **Follow the template structure** - Copy from UserStoryTemplate.js
3. **Define clear user stories** - Use the "As a... I want... So that..." format
4. **Include ground truths** - Real data that must appear
5. **Include forbidden data** - Mock data that must NOT appear
6. **Capture comprehensive screenshots** - At every major step
7. **Generate HTML reports** - Automatically done by framework
8. **Add to test suite** - Update test-suite.js with new tests

## Command Reference

```bash
# Run individual test
node test-[name]-story.js

# Run test suite
npm run test:suite

# Run specific test from package.json
npm run test:arcana
npm run test:[your-test]

# View results
open /Users/gianmatteo/Documents/Arcana-Prototype/tests/[latest]/report.html
```

---

**Last Updated**: August 2025
**Framework Version**: 1.0.0
**Maintainer**: E2E Test Framework

⚠️ **IMPORTANT**: This framework is the STANDARD for all E2E user story tests. Do not create custom test patterns - use this framework!