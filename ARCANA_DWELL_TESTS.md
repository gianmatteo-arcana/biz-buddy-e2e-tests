# Arcana Dwell LLC - E2E Test Documentation

## Overview

This test suite validates the complete user story for Arcana Dwell LLC, ensuring that:
1. Real business ground truths are displayed (not mock data)
2. The resilient fallback pattern works when APIs are unavailable
3. Dev Toolkit shows real agent activity
4. All PRD requirements are met

## Ground Truths

The following real business data is validated in these tests:

| Field | Value |
|-------|-------|
| Business Name | Arcana Dwell LLC |
| Entity Number | 201919710409 |
| Formation Date | 07/10/2019 |
| Federal EIN | 84-2455935 |
| SF Business License | 1106755 |
| ABC Liquor License | 621463 |
| SF Health Permit | 20121533939 |
| SF Entertainment Permit | 1586 |
| Address | 2512 Mission St, San Francisco, CA 94110 |
| Owners | Gianmatteo Costanza (50%), Farnaz (Naz) Khorram (50%) |
| Business Type | Wine Bar, Music & Entertainment Venue |
| Primary Bank | Wells Fargo |
| Annual Revenue | $2M |

## Running the Tests

### Quick Start

```bash
# Run the Arcana Dwell user story test
npm run test:arcana

# Run the complete test suite
npm run test:suite

# Run with Puppeteer instead of Playwright
npm run test:arcana:puppeteer
```

### Test Files

- **`test-arcana-dwell-user-story.js`** - Main test file that validates all ground truths
- **`test-suite.js`** - Test suite runner that can run multiple tests
- **Output** - All test results are saved to `/Users/gianmatteo/Documents/Arcana-Prototype/tests/`

### Test Coverage

The test validates:

1. **Onboarding Flow**
   - Welcome screen displays
   - "Get Started" button works
   - Business discovery shows "Arcana Dwell LLC"
   - API fallback messages appear
   - User guidance is provided
   - Profile is populated with real data
   - Compliance requirements are shown
   - UX optimization occurs
   - Celebration screen appears

2. **Dev Toolkit**
   - Agent activity logs are displayed
   - BusinessDiscoveryAgent is active
   - User guidance messages appear
   - Arcana Dwell is mentioned in logs
   - Timestamps are shown
   - Status badges work

3. **Data Integrity**
   - All ground truths are present
   - No mock data (Sarah Chen, TechStartup) appears
   - Resilient fallback pattern works
   - User guidance is provided when APIs unavailable

## Test Output

Each test run generates:

1. **Screenshots** - Full page captures at each step
2. **JSON Report** - `test-results.json` with detailed results
3. **HTML Report** - `report.html` with visual test results
4. **Console Output** - Real-time test progress

### Example Output Structure

```
/Users/gianmatteo/Documents/Arcana-Prototype/tests/arcana-dwell-[timestamp]/
├── 01-initial-load.png
├── 02-business-discovery.png
├── 03-profile-collection.png
├── 04-compliance.png
├── 05-optimization.png
├── 06-celebration.png
├── 07-dev-toolkit.png
├── test-results.json
└── report.html
```

## Validation Criteria

### ✅ MUST PASS

- Arcana Dwell LLC name displayed
- Correct address (2512 Mission St)
- Real owners shown (Gianmatteo, Farnaz)
- Formation date correct (07/10/2019)
- Business type is "Wine Bar, Music & Entertainment Venue"
- Dev Toolkit shows agent activity
- API fallback messages when unavailable
- User guidance provided

### ❌ MUST NOT APPEAR

- "Sarah Chen" (old mock data)
- "TechStartup" or "TechStartup Inc" (old mock data)
- Any reference to "demo" or "mock" companies
- Placeholder data

## Resilient Architecture Pattern

The tests validate the resilient fallback pattern:

```
API Available → Use API data
     ↓ (if unavailable)
Show fallback message → "CA Secretary of State API not available"
     ↓
Request user input → "Please provide: 1) Business name..."
     ↓
Use ground truths → Arcana Dwell LLC data
```

## CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```bash
# GitHub Actions example
- name: Run Arcana Dwell Tests
  run: |
    npm install
    npm run test:arcana
```

## Troubleshooting

### Common Issues

1. **Test fails to find elements**
   - Ensure the app is running on `http://localhost:8080`
   - Check that the latest code is deployed

2. **Screenshots not capturing**
   - Verify write permissions to `/Users/gianmatteo/Documents/Arcana-Prototype/tests/`
   - Check disk space

3. **Authentication issues**
   - Run `npm run auth:refresh` to update auth state
   - Check `.auth/user-state.json` exists

## Maintenance

### Updating Ground Truths

Ground truths are defined in:
- Frontend: `biz-buddy-ally-now/src/data/arcana-dwell-ground-truths.ts`
- Tests: `test-arcana-dwell-user-story.js` (CONFIG object)

Keep both in sync when updating business data.

### Adding New Tests

To add new tests to the suite:

1. Create a new test file
2. Export a test class with a `run()` method
3. Add to `test-suite.js`:

```javascript
this.tests = [
  {
    name: 'Your New Test',
    description: 'What it validates',
    runner: () => new YourTestClass().run()
  },
  // ... existing tests
];
```

## Success Metrics

The test is considered successful when:
- **100% of ground truths** are displayed correctly
- **0% mock data** appears
- **Resilient fallback** messages are shown
- **Dev Toolkit** captures all agent activity
- **All screenshots** are captured successfully

---

Last Updated: August 2025
Test User: gianmatteo.allyn.test@gmail.com