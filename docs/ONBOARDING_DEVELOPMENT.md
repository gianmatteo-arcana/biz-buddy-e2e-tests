# Onboarding Development Workflow

## 🎯 Goal

Fix and implement the onboarding flow according to the PRD using a test-driven development approach.

## 📋 PRD Requirements

Based on [PRD Document](https://docs.google.com/document/d/1kNk0Nw4An2Y3tEPOFPfhKdTJGlzCIL04UGSc7tHFGfY/edit):

1. **Welcome Screen** - Value propositions and personalized greeting
2. **Business Information** - Collect basic business details
3. **Business Goals** - Understand priorities and compliance needs
4. **Confirmation** - Success message and dashboard redirect

## 🔄 Development Cycle

### 1. Test First
```bash
# Run onboarding tests to see current state
npm run test:onboarding

# Run in debug mode to step through
npm run test:onboarding:debug
```

### 2. Implement
- Make changes in the main BizBuddy codebase
- Focus on one step at a time
- Use test failures to guide implementation

### 3. Verify
```bash
# Run specific test
npx playwright test tests/e2e/onboarding-flow.spec.ts -g "Welcome screen"

# Take screenshots for visual verification
npm run test:onboarding -- --screenshot=on
```

### 4. Iterate
- Fix issues found in tests
- Add more detailed tests as needed
- Refactor for better UX

## 🧪 Testing Scenarios

### Scenario 1: First-Time User
```bash
# Clear any existing auth
rm -rf .auth/

# Run manual test
npm run test:manual-signup
```
**Expected**: User sees onboarding after OAuth

### Scenario 2: Returning User  
```bash
# Use existing auth
npm run test:safe
```
**Expected**: User goes straight to dashboard

### Scenario 3: Partial Completion
1. Start onboarding
2. Complete only first step
3. Close browser
4. Sign in again
**Expected**: Resume from last step

## 🐛 Current Issues

### Issue 1: No Onboarding Redirect
**Problem**: New users go straight to dashboard
**Solution**: Check auth hook for first-time user detection

### Issue 2: Missing Onboarding Components
**Problem**: Onboarding screens not implemented
**Solution**: Create components for each step

### Issue 3: State Management
**Problem**: Onboarding progress not saved
**Solution**: Implement state persistence in database

## 📝 Implementation Checklist

- [ ] Fix first-time user detection
- [ ] Create onboarding route/layout
- [ ] Implement welcome screen component
- [ ] Build business info form
- [ ] Add goals selection step
- [ ] Create confirmation screen
- [ ] Add progress indicator
- [ ] Implement state persistence
- [ ] Add skip option
- [ ] Handle edge cases

## 🔧 Quick Commands

```bash
# Start development
cd ~/Documents/Arcana-Prototype
lovable-dev

# In another terminal - run tests
cd ~/Documents/Arcana-Prototype/biz-buddy-e2e-tests
npm run test:onboarding

# Check specific component
npx playwright test -g "Welcome screen" --headed

# Visual debugging
npm run test:onboarding:debug
```

## 📊 Progress Tracking

Use the test output to track progress:
- 🔴 Red = Not implemented
- 🟡 Yellow = Partially working  
- 🟢 Green = Complete

Current Status:
- [ ] Welcome Screen
- [ ] Business Info Form
- [ ] Goals Selection
- [ ] Confirmation
- [ ] Dashboard Redirect

## 🎨 UI Components Needed

1. **OnboardingContainer** - Main wrapper with progress
2. **WelcomeStep** - Value props and CTA
3. **BusinessInfoStep** - Form with validation
4. **GoalsStep** - Multi-select options
5. **ConfirmationStep** - Success state
6. **ProgressIndicator** - Visual progress

## 💡 Tips

1. **Use test IDs** for reliable test selectors:
   ```tsx
   <div data-testid="onboarding-welcome">
   ```

2. **Log state changes** for debugging:
   ```tsx
   console.log('Onboarding step:', currentStep);
   ```

3. **Take screenshots** at each step:
   ```bash
   await page.screenshot({ path: `onboarding-${step}.png` });
   ```

4. **Test with fresh user** each time:
   ```bash
   # Clear local storage
   await page.evaluate(() => localStorage.clear());
   ```