# 📸 SCREENSHOT UPLOAD CHECKLIST FOR GITHUB ISSUES

## ⚠️ CRITICAL: This checklist MUST be followed for EVERY issue update with screenshots

### 🔴 PRE-UPLOAD VERIFICATION
- [ ] Screenshots captured from E2E tests
- [ ] Screenshots saved locally in test results directory
- [ ] Issue number identified (e.g., #31)

### 📁 STEP 1: PREPARE DIRECTORY
```bash
cd /Users/gianmatteo/Documents/Arcana-Prototype-2/biz-buddy-e2e-tests
mkdir -p uploaded-screenshots/issue-{NUMBER}
```
- [ ] Directory created in e2e-tests repo
- [ ] Directory named with issue number

### 📋 STEP 2: COPY SCREENSHOTS
```bash
cp {test-results-dir}/*.png uploaded-screenshots/issue-{NUMBER}/
```
- [ ] All relevant screenshots copied
- [ ] Files are in the correct directory

### 🚀 STEP 3: COMMIT AND PUSH
```bash
git add uploaded-screenshots/issue-{NUMBER}/
git commit -m "feat: Add screenshots for issue #{NUMBER}"
git push origin main
```
- [ ] Files added to git
- [ ] Commit message includes issue number
- [ ] Successfully pushed to GitHub

### ✅ STEP 4: VERIFY URLS
```bash
# Test each URL before using
curl -I https://raw.githubusercontent.com/gianmatteo-arcana/biz-buddy-e2e-tests/main/uploaded-screenshots/issue-{NUMBER}/{filename}.png
```
- [ ] Each URL returns HTTP 200
- [ ] URLs use raw.githubusercontent.com
- [ ] URLs point to main branch

### 📝 STEP 5: UPDATE ISSUE
```markdown
![Description](https://raw.githubusercontent.com/gianmatteo-arcana/biz-buddy-e2e-tests/main/uploaded-screenshots/issue-{NUMBER}/{filename}.png)
```
- [ ] Using raw GitHub URLs (not placeholders)
- [ ] Each screenshot has a description
- [ ] Markdown syntax is correct

### 🔍 STEP 6: FINAL VERIFICATION
- [ ] Navigate to GitHub issue
- [ ] All screenshots are visible
- [ ] No broken image icons
- [ ] Screenshots properly demonstrate the feature/fix

## ❌ COMMON MISTAKES TO AVOID

### NEVER USE:
```markdown
# WRONG - Placeholder URLs
![Screenshot](https://github.com/.../assets/placeholder/image.png)

# WRONG - Local paths
![Screenshot](/Users/gianmatteo/screenshots/image.png)

# WRONG - Attachment references without upload
![Screenshot](attachment://image.png)
```

### ALWAYS USE:
```markdown
# CORRECT - Raw GitHub URL after upload
![Screenshot](https://raw.githubusercontent.com/gianmatteo-arcana/biz-buddy-e2e-tests/main/uploaded-screenshots/issue-31/screenshot.png)
```

## 📊 SUCCESS CRITERIA
✅ All checkboxes above are checked
✅ Screenshots visible in GitHub issue
✅ URLs return HTTP 200
✅ Work can be considered COMPLETE

## 🚨 FAILURE CONDITIONS
❌ Any unchecked box = INCOMPLETE
❌ Broken images in issue = FAILURE
❌ 404 errors = MUST FIX IMMEDIATELY

---

**This checklist is MANDATORY for all screenshot uploads to GitHub issues.**
**Date Created**: August 14, 2025
**Purpose**: Prevent recurring failures in screenshot uploads
**Enforcement**: Work is NOT complete until all screenshots are visible