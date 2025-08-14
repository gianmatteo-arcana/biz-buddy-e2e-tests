# E2E Screenshot System - Operational Procedures

## 🎯 **Complete Operational Guide**

This document provides step-by-step procedures for using the repository-based screenshot system with 10-day auto-cleanup.

---

## 📋 **When to Use Screenshot Documentation**

### **MANDATORY Usage:**
- ✅ Bug fixes requiring visual proof of resolution
- ✅ Feature implementations needing demonstration  
- ✅ Migration fixes showing before/after states
- ✅ UI changes requiring visual verification
- ✅ Authentication fixes showing successful login states
- ✅ Any E2E test completion requiring evidence

---

## 🔄 **Standard Operating Procedure**

### **Step 1: Execute E2E Test with Screenshots**

Run your E2E test that captures screenshots:

```bash
# Examples of tests that generate screenshots:
node autonomous-test.js
node test-dev-toolkit-real-auth.js
node test-migration-flow.js
```

Verify screenshots are generated in the expected location (typically `demo-screenshots/` or test output directory).

### **Step 2: Upload Screenshots to GitHub Issue**

Use the proven workflow to upload screenshots and embed them in the target issue:

```bash
gh workflow run "Upload Test Screenshots" \
  --repo gianmatteo-arcana/biz-buddy-e2e-tests \
  -f issue_number=ISSUE_NUMBER \
  -f test_name="DESCRIPTIVE_TEST_NAME"
```

**Template Examples:**

```bash
# For bug fixes:
gh workflow run "Upload Test Screenshots" \
  --repo gianmatteo-arcana/biz-buddy-e2e-tests \
  -f issue_number=19 \
  -f test_name="Migration Fix - Edge Function Issue Resolved"

# For feature completion:
gh workflow run "Upload Test Screenshots" \
  --repo gianmatteo-arcana/biz-buddy-e2e-tests \
  -f issue_number=25 \
  -f test_name="Authentication Flow - Feature Complete"

# For UI verification:
gh workflow run "Upload Test Screenshots" \
  --repo gianmatteo-arcana/biz-buddy-e2e-tests \
  -f issue_number=30 \
  -f test_name="Dashboard Update - Real Data Display"
```

### **Step 3: Verify Upload Success**

1. **Check Workflow Execution**: Visit https://github.com/gianmatteo-arcana/biz-buddy-e2e-tests/actions
2. **Verify Issue Comment**: Screenshots should appear in the target GitHub issue within 2-3 minutes
3. **Confirm Image Display**: Screenshots should be visible as embedded images, not raw URLs

### **Step 4: Update Issue Status**

Use the provided template to add context and close the issue:

```markdown
## 🎯 E2E Test Results - [ISSUE TITLE]

### ✅ **Resolution Status**: COMPLETE

**Test Executed**: [TEST_NAME]  
**Date**: [DATE]  
**Screenshots**: Automatically uploaded via workflow  

### 📊 **Test Results**
- ✅ [Specific functionality verified]
- ✅ [UI state confirmed]
- ✅ [Backend integration working]

### 🔧 **Changes Made**
- [Brief description of fixes]
- [Configuration updates]
- [Dependencies updated]

**Issue Status**: ✅ RESOLVED
```

---

## 🛠️ **Technical Procedures**

### **Using with BaseUserStoryTest Framework**

For tests using the standardized framework:

```javascript
const test = new BaseUserStoryTest({
  name: 'Authentication Flow Test',
  description: 'Verify complete OAuth authentication flow'
});

// Run test with automatic issue update
await test.completeWithIssueUpdate(issueNumber, {
  testName: 'Authentication Fix - Dev Toolkit Badge Working'
});
```

### **Manual Screenshot Directory Setup**

If you need to organize screenshots manually:

```bash
# Create issue-specific directory
mkdir -p demo-screenshots/issue-19

# Copy your test screenshots
cp your-test-screenshots/*.png demo-screenshots/issue-19/

# Then run the upload workflow
gh workflow run "Upload Test Screenshots" \
  --repo gianmatteo-arcana/biz-buddy-e2e-tests \
  -f issue_number=19 \
  -f test_name="Manual Screenshot Upload"
```

---

## 🔍 **Troubleshooting Guide**

### **Screenshots Not Appearing in Issue**

1. **Check Workflow Status**: 
   ```bash
   gh run list --repo gianmatteo-arcana/biz-buddy-e2e-tests
   ```

2. **Verify Repository is Public**: 
   ```bash
   gh repo view gianmatteo-arcana/biz-buddy-e2e-tests --json visibility
   # Should show: "visibility": "PUBLIC"
   ```

3. **Check File Permissions**:
   ```bash
   ls -la uploaded-screenshots/issue-*/
   ```

### **Workflow Fails to Find Screenshots**

1. **Check Screenshot Locations**:
   ```bash
   find . -name "*.png" -mtime -1  # Find PNG files from last day
   ```

2. **Verify Directory Structure**:
   ```bash
   ls -la demo-screenshots/issue-19/
   ls -la test-artifacts/issue-19/
   ```

### **Issue Comments Not Created**

1. **Verify Target Repository**: Ensure you're commenting on the correct repo (usually `biz-buddy-ally-now`)
2. **Check Permissions**: Workflow needs `issues: write` permission
3. **Confirm Issue Number**: Ensure issue number exists and is accessible

---

## 📊 **Monitoring and Maintenance**

### **Repository Size Monitoring**

```bash
# Check screenshot storage size
du -sh uploaded-screenshots/

# Count total files
find uploaded-screenshots/ -type f | wc -l

# Check auto-cleanup logs
gh run list --workflow="Auto Cleanup Screenshots" --repo gianmatteo-arcana/biz-buddy-e2e-tests
```

### **Auto-Cleanup Verification**

The auto-cleanup runs daily at 2 AM UTC. To verify:

```bash
# Check recent cleanup runs
gh run list --workflow="Auto Cleanup Screenshots" --limit 5

# View cleanup logs
gh run view [RUN_ID] --log

# Manual cleanup test (dry run)
gh workflow run "Auto Cleanup Screenshots" \
  --repo gianmatteo-arcana/biz-buddy-e2e-tests \
  -f dry_run=true
```

### **File Age Verification**

```bash
# Check file ages in uploaded screenshots
find uploaded-screenshots/ -name "*.png" -exec ls -la {} \; | head -10

# Check git commit dates for files
git log --oneline --grep="📸 Upload screenshot" | head -10
```

---

## 🏆 **Success Metrics**

### **A Successful Screenshot Update Includes:**

- ✅ **Screenshots visible** in the target GitHub issue
- ✅ **Clear visual evidence** of test results or bug resolution
- ✅ **Proper issue context** with descriptive test names
- ✅ **Issue status updated** to reflect resolution
- ✅ **Auto-cleanup working** to prevent repository bloat

### **Quality Standards:**

1. **Screenshot Content**: Must show relevant application state
2. **Test Names**: Descriptive and searchable
3. **Issue Comments**: Include context and resolution status
4. **Maintenance**: Auto-cleanup keeps repository clean

---

## 🚀 **Integration with Development Workflow**

### **For Bug Fixes:**
1. Fix bug in code
2. Run E2E test with screenshots  
3. Upload screenshots to bug report issue
4. Update issue with resolution status
5. Close issue with visual evidence

### **For Feature Implementation:**
1. Implement feature
2. Create E2E test demonstrating feature
3. Run test with screenshot capture
4. Upload screenshots to feature issue
5. Mark feature as complete with evidence

### **For Migration Tasks:**
1. Apply migration or fix
2. Run comprehensive E2E test
3. Capture before/after states if applicable
4. Upload visual evidence to migration issue
5. Document successful migration completion

---

## 📝 **Quick Reference Commands**

```bash
# Upload screenshots to issue
gh workflow run "Upload Test Screenshots" \
  --repo gianmatteo-arcana/biz-buddy-e2e-tests \
  -f issue_number=ISSUE_NUM -f test_name="TEST_NAME"

# Check recent uploads
gh run list --workflow="Upload Test Screenshots" --limit 5

# View repository size
du -sh uploaded-screenshots/

# Test auto-cleanup (dry run)
gh workflow run "Auto Cleanup Screenshots" \
  --repo gianmatteo-arcana/biz-buddy-e2e-tests -f dry_run=true

# Find recent screenshots
find . -name "*.png" -mtime -1
```

---

**This operational system ensures consistent, professional documentation of E2E test results with automated maintenance and immediate visual accessibility for stakeholders.**