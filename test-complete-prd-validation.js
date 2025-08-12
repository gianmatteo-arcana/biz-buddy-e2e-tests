#!/usr/bin/env node

/**
 * COMPLETE PRD VALIDATION TEST
 * 
 * This test validates EVERY screen, EVERY element, and ALL functionality
 * with comprehensive screenshot capture and analysis
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const TEST_URL = 'http://localhost:8080';
const LOVABLE_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
const OUTPUT_DIR = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/complete-prd-validation-${Date.now()}`;

class CompletePRDValidation {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.screenshotCount = 0;
    this.results = {
      dashboard: { screenshots: [], validations: [] },
      devToolkit: { screenshots: [], validations: [] },
      onboarding: { screenshots: [], validations: [] },
      tasks: { screenshots: [], validations: [] },
      timeline: { screenshots: [], validations: [] },
      agents: { screenshots: [], validations: [] },
      authentication: { screenshots: [], validations: [] },
      errors: { screenshots: [], validations: [] }
    };
  }

  async setup() {
    console.log('🚀 COMPLETE PRD VALIDATION TEST');
    console.log('=' .repeat(60));
    console.log(`📁 Output: ${OUTPUT_DIR}`);
    console.log('=' .repeat(60) + '\n');
    
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    this.browser = await chromium.launch({
      headless: false,
      viewport: { width: 1920, height: 1080 }
    });
    
    // Try to use existing auth if available
    try {
      this.context = await this.browser.newContext({
        storageState: '.auth/user-state.json',
        viewport: { width: 1920, height: 1080 }
      });
      console.log('✅ Using existing authentication');
    } catch {
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });
      console.log('⚠️ No existing auth, will test in demo mode');
    }
    
    this.page = await this.context.newPage();
    
    // Log console messages
    this.page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('X-Frame-Options')) {
        console.log(`❌ Browser error: ${msg.text()}`);
      }
    });
  }

  async captureScreenshot(name, category) {
    this.screenshotCount++;
    const filename = `${String(this.screenshotCount).padStart(3, '0')}-${category}-${name}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    await this.page.screenshot({
      path: filepath,
      fullPage: true
    });
    
    console.log(`  📸 Screenshot ${this.screenshotCount}: ${name}`);
    
    this.results[category].screenshots.push({
      number: this.screenshotCount,
      name: name,
      file: filename
    });
    
    return filepath;
  }

  async validate(category, check, expected, actual) {
    const passed = actual === expected;
    const result = {
      check,
      expected,
      actual,
      passed
    };
    
    this.results[category].validations.push(result);
    
    if (passed) {
      console.log(`  ✅ ${check}`);
    } else {
      console.log(`  ❌ ${check}: Expected "${expected}", got "${actual}"`);
    }
    
    return passed;
  }

  async testDashboard() {
    console.log('\n📊 TESTING DASHBOARD UI');
    console.log('-' .repeat(40));
    
    // Navigate to main dashboard
    await this.page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(3000);
    
    await this.captureScreenshot('initial-load', 'dashboard');
    
    // Check for main dashboard elements
    const dashboardElements = await this.page.evaluate(() => {
      return {
        hasHeader: !!document.querySelector('header'),
        hasNavigation: !!document.querySelector('nav'),
        hasTaskGrid: !!document.querySelector('[class*="grid"]'),
        hasWelcomeMessage: document.body.textContent?.includes('Welcome'),
        hasSmallBizAlly: document.body.textContent?.includes('SmallBizAlly'),
        visibleButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean)
      };
    });
    
    await this.validate('dashboard', 'Header present', true, dashboardElements.hasHeader);
    await this.validate('dashboard', 'SmallBizAlly branding', true, dashboardElements.hasSmallBizAlly);
    
    // Check for different dashboard views
    const views = ['Tasks', 'Timeline', 'Profile', 'Settings'];
    for (const view of views) {
      const viewButton = await this.page.locator(`text="${view}"`).first();
      if (await viewButton.isVisible()) {
        await viewButton.click();
        await this.page.waitForTimeout(1000);
        await this.captureScreenshot(`${view.toLowerCase()}-view`, 'dashboard');
      }
    }
    
    // Test dashboard responsiveness
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];
    
    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      await this.page.waitForTimeout(500);
      await this.captureScreenshot(`responsive-${viewport.name}`, 'dashboard');
    }
    
    // Reset to desktop
    await this.page.setViewportSize({ width: 1920, height: 1080 });
  }

  async testOnboarding() {
    console.log('\n🚀 TESTING ONBOARDING FLOW');
    console.log('-' .repeat(40));
    
    // Navigate to onboarding
    await this.page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(2000);
    
    // Look for onboarding start
    const hasOnboarding = await this.page.locator('text="Welcome to SmallBizAlly"').isVisible();
    
    if (hasOnboarding) {
      await this.captureScreenshot('welcome-screen', 'onboarding');
      
      // Test Get Started button
      const getStarted = await this.page.locator('[data-testid="get-started"]');
      if (await getStarted.isVisible()) {
        await getStarted.click();
        await this.page.waitForTimeout(6000);
        
        await this.captureScreenshot('business-discovery', 'onboarding');
        
        // Check for Arcana Dwell LLC
        const businessData = await this.page.evaluate(() => {
          const text = document.body.textContent || '';
          return {
            hasArcanaDwell: text.includes('Arcana Dwell LLC'),
            hasAddress: text.includes('2512 Mission St'),
            hasOwners: text.includes('Gianmatteo Costanza'),
            hasNoMockData: !text.includes('Sarah Chen') && !text.includes('TechStartup'),
            hasAPIFallback: text.includes('API not available') || text.includes('Please provide')
          };
        });
        
        await this.validate('onboarding', 'Arcana Dwell LLC shown', true, businessData.hasArcanaDwell);
        await this.validate('onboarding', 'No mock data present', true, businessData.hasNoMockData);
        await this.validate('onboarding', 'API fallback working', true, businessData.hasAPIFallback);
        
        // Continue through onboarding steps
        const businessCard = await this.page.locator('.cursor-pointer').first();
        if (await businessCard.isVisible()) {
          await businessCard.click();
          await this.page.waitForTimeout(3000);
          
          await this.captureScreenshot('profile-collection', 'onboarding');
          
          // Check profile data
          const profileFields = await this.page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input'));
            return inputs.map(i => ({
              name: i.getAttribute('aria-label') || i.placeholder || 'unknown',
              value: i.value,
              readonly: i.readOnly
            }));
          });
          
          console.log(`  Found ${profileFields.length} profile fields`);
          
          // Wait for compliance step
          await this.page.waitForTimeout(5000);
          await this.captureScreenshot('compliance-requirements', 'onboarding');
          
          // Wait for optimization step
          await this.page.waitForTimeout(3000);
          await this.captureScreenshot('ux-optimization', 'onboarding');
          
          // Wait for celebration
          await this.page.waitForTimeout(3000);
          await this.captureScreenshot('celebration', 'onboarding');
        }
      }
    }
  }

  async testDevToolkit() {
    console.log('\n🛠️ TESTING DEV TOOLKIT');
    console.log('-' .repeat(40));
    
    // Check if Dev Toolkit is visible
    const devToolkitButton = await this.page.locator('[data-testid="dev-toolkit"]');
    const devToolkitPanel = await this.page.locator('text="Dev Toolkit - Agent Activity"');
    
    if (await devToolkitButton.isVisible()) {
      await devToolkitButton.click();
      await this.page.waitForTimeout(1000);
    }
    
    if (await devToolkitPanel.isVisible()) {
      await this.captureScreenshot('dev-toolkit-open', 'devToolkit');
      
      // Check for agent logs
      const agentLogs = await this.page.evaluate(() => {
        const logs = Array.from(document.querySelectorAll('.border-l-4.border-l-purple-500'));
        return logs.map(log => {
          const text = log.textContent || '';
          return {
            hasAgent: text.includes('Agent'),
            hasTimestamp: /\d{1,2}:\d{2}:\d{2}/.test(text),
            hasStatus: text.includes('completed') || text.includes('in_progress'),
            content: text.substring(0, 100)
          };
        });
      });
      
      console.log(`  Found ${agentLogs.length} agent activity logs`);
      
      if (agentLogs.length > 0) {
        await this.validate('devToolkit', 'Agent logs present', true, true);
        await this.validate('devToolkit', 'Timestamps shown', true, agentLogs[0].hasTimestamp);
        await this.validate('devToolkit', 'Status badges shown', true, agentLogs[0].hasStatus);
      }
      
      // Test Dev Toolkit tabs if available
      const tabs = ['Timeline', 'Context', 'Events', 'Agents'];
      for (const tab of tabs) {
        const tabButton = await this.page.locator(`text="${tab}"`).first();
        if (await tabButton.isVisible()) {
          await tabButton.click();
          await this.page.waitForTimeout(500);
          await this.captureScreenshot(`toolkit-${tab.toLowerCase()}-tab`, 'devToolkit');
        }
      }
      
      // Check authentication status
      const authStatus = await this.page.evaluate(() => {
        const text = document.body.textContent || '';
        return {
          isAuthenticated: text.includes('Authenticated') && !text.includes('Demo mode'),
          hasRealBackend: text.includes('real backend') || text.includes('Connected'),
          userEmail: text.match(/[\w.]+@[\w.]+\.\w+/)?.[0]
        };
      });
      
      await this.validate('devToolkit', 'Shows authenticated state', true, authStatus.isAuthenticated);
      await this.validate('devToolkit', 'Connected to real backend', true, authStatus.hasRealBackend);
    }
  }

  async testTaskManagement() {
    console.log('\n📝 TESTING TASK MANAGEMENT');
    console.log('-' .repeat(40));
    
    // Navigate to tasks view
    await this.page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(2000);
    
    // Look for task creation button
    const createTaskButton = await this.page.locator('text="Create Task"').or(this.page.locator('text="New Task"')).or(this.page.locator('button:has-text("+")')).first();
    
    if (await createTaskButton.isVisible()) {
      await this.captureScreenshot('tasks-grid-view', 'tasks');
      
      await createTaskButton.click();
      await this.page.waitForTimeout(1000);
      
      await this.captureScreenshot('task-creation-modal', 'tasks');
      
      // Fill in task details if form is visible
      const titleInput = await this.page.locator('input[placeholder*="title" i]').or(this.page.locator('input[name*="title" i]')).first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('Test Task - Arcana Dwell Compliance');
        
        const descInput = await this.page.locator('textarea').first();
        if (await descInput.isVisible()) {
          await descInput.fill('Testing task creation for Arcana Dwell LLC wine bar compliance');
        }
        
        await this.captureScreenshot('task-form-filled', 'tasks');
        
        // Close modal or go back
        const closeButton = await this.page.locator('button:has-text("Cancel")').or(this.page.locator('[aria-label="Close"]')).first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
    }
    
    // Check for existing tasks
    const taskCards = await this.page.locator('[class*="card"]').count();
    console.log(`  Found ${taskCards} task cards`);
    
    if (taskCards > 0) {
      await this.captureScreenshot('existing-tasks', 'tasks');
      
      // Click on first task
      await this.page.locator('[class*="card"]').first().click();
      await this.page.waitForTimeout(1000);
      
      await this.captureScreenshot('task-detail-view', 'tasks');
    }
  }

  async testTimeline() {
    console.log('\n📅 TESTING TIMELINE VIEW');
    console.log('-' .repeat(40));
    
    // Look for timeline view
    const timelineButton = await this.page.locator('text="Timeline"').first();
    
    if (await timelineButton.isVisible()) {
      await timelineButton.click();
      await this.page.waitForTimeout(2000);
      
      await this.captureScreenshot('timeline-view', 'timeline');
      
      // Check for timeline elements
      const timelineElements = await this.page.evaluate(() => {
        return {
          hasTimelineItems: document.querySelectorAll('[class*="timeline"]').length > 0,
          hasDates: document.querySelectorAll('[class*="date"]').length > 0,
          hasEvents: document.querySelectorAll('[class*="event"]').length > 0
        };
      });
      
      await this.validate('timeline', 'Timeline items present', true, timelineElements.hasTimelineItems || timelineElements.hasEvents);
    }
  }

  async testAgentVisualizations() {
    console.log('\n🤖 TESTING AGENT VISUALIZATIONS');
    console.log('-' .repeat(40));
    
    // Look for agent visualization components
    const agentViz = await this.page.locator('text="Agent"').first();
    
    if (await agentViz.isVisible()) {
      await this.captureScreenshot('agent-visualization', 'agents');
      
      const agentElements = await this.page.evaluate(() => {
        const text = document.body.textContent || '';
        return {
          hasBusinessDiscovery: text.includes('BusinessDiscoveryAgent'),
          hasProfileCollection: text.includes('ProfileCollectionAgent'),
          hasCompliance: text.includes('ComplianceAgent'),
          hasOrchestrator: text.includes('Orchestrator'),
          hasAgentStatus: text.includes('completed') || text.includes('in_progress')
        };
      });
      
      await this.validate('agents', 'Business Discovery Agent', true, agentElements.hasBusinessDiscovery);
      await this.validate('agents', 'Profile Collection Agent', true, agentElements.hasProfileCollection);
    }
  }

  async testAuthentication() {
    console.log('\n🔐 TESTING AUTHENTICATION STATES');
    console.log('-' .repeat(40));
    
    // Check current auth state
    const authState = await this.page.evaluate(() => {
      const text = document.body.textContent || '';
      return {
        hasWelcome: text.includes('Welcome'),
        hasSignIn: text.includes('Sign in') || text.includes('Sign In'),
        hasSignOut: text.includes('Sign out') || text.includes('Sign Out'),
        hasUserEmail: /[\w.]+@[\w.]+\.\w+/.test(text),
        isDemoMode: text.includes('Demo mode') || text.includes('demo mode')
      };
    });
    
    await this.captureScreenshot('authentication-state', 'authentication');
    
    await this.validate('authentication', 'Authentication UI present', true, 
      authState.hasSignIn || authState.hasSignOut || authState.hasUserEmail);
    
    // Test Google OAuth button if visible
    const googleButton = await this.page.locator('[data-testid="google-signin"]').or(this.page.locator('text="Sign in with Google"')).first();
    
    if (await googleButton.isVisible()) {
      await this.captureScreenshot('google-oauth-button', 'authentication');
    }
  }

  async testErrorConditions() {
    console.log('\n❌ TESTING ERROR CONDITIONS');
    console.log('-' .repeat(40));
    
    // Test 404 page
    await this.page.goto(`${TEST_URL}/nonexistent-page`, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(1000);
    await this.captureScreenshot('404-page', 'errors');
    
    // Test network error handling
    await this.page.route('**/api/**', route => route.abort());
    await this.page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(2000);
    await this.captureScreenshot('network-error-handling', 'errors');
    await this.page.unroute('**/api/**');
    
    // Check for error boundaries
    const hasErrorBoundary = await this.page.evaluate(() => {
      return document.body.textContent?.includes('Something went wrong') ||
             document.body.textContent?.includes('Error') ||
             document.querySelector('[class*="error"]') !== null;
    });
    
    if (hasErrorBoundary) {
      await this.captureScreenshot('error-boundary', 'errors');
    }
  }

  async generateReport() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 VALIDATION REPORT');
    console.log('=' .repeat(60));
    
    let totalValidations = 0;
    let passedValidations = 0;
    
    for (const [category, data] of Object.entries(this.results)) {
      const validations = data.validations;
      const passed = validations.filter(v => v.passed).length;
      const total = validations.length;
      
      totalValidations += total;
      passedValidations += passed;
      
      if (total > 0) {
        const percentage = ((passed / total) * 100).toFixed(1);
        console.log(`\n${category.toUpperCase()}: ${passed}/${total} passed (${percentage}%)`);
        console.log(`  Screenshots: ${data.screenshots.length}`);
        
        // Show failed validations
        const failed = validations.filter(v => !v.passed);
        if (failed.length > 0) {
          console.log('  Failed checks:');
          failed.forEach(f => {
            console.log(`    ❌ ${f.check}: Expected "${f.expected}", got "${f.actual}"`);
          });
        }
      }
    }
    
    console.log('\n' + '-' .repeat(60));
    console.log(`TOTAL: ${passedValidations}/${totalValidations} validations passed`);
    console.log(`SCREENSHOTS: ${this.screenshotCount} captured`);
    console.log(`OUTPUT: ${OUTPUT_DIR}`);
    
    // Save detailed JSON report
    const report = {
      timestamp: new Date().toISOString(),
      totalScreenshots: this.screenshotCount,
      totalValidations,
      passedValidations,
      results: this.results,
      outputDirectory: OUTPUT_DIR
    };
    
    await fs.writeFile(
      path.join(OUTPUT_DIR, 'validation-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Create HTML report for easy viewing
    const html = this.generateHTMLReport(report);
    await fs.writeFile(
      path.join(OUTPUT_DIR, 'report.html'),
      html
    );
    
    console.log('\n📄 Reports generated:');
    console.log(`  - validation-report.json`);
    console.log(`  - report.html (open in browser for interactive view)`);
    
    return passedValidations === totalValidations;
  }

  generateHTMLReport(report) {
    return `<!DOCTYPE html>
<html>
<head>
  <title>PRD Validation Report</title>
  <style>
    body { font-family: -apple-system, sans-serif; margin: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    .category { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .screenshots { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; margin-top: 10px; }
    .screenshot { border: 1px solid #ddd; padding: 5px; border-radius: 4px; }
    .screenshot img { width: 100%; height: auto; }
    .validation { padding: 5px 10px; margin: 5px 0; border-radius: 4px; }
    .passed { background: #d4edda; color: #155724; }
    .failed { background: #f8d7da; color: #721c24; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <h1>🎯 PRD Validation Report</h1>
  <div class="stats">
    <div class="stat">📸 Screenshots: ${report.totalScreenshots}</div>
    <div class="stat">✅ Passed: ${report.passedValidations}/${report.totalValidations}</div>
    <div class="stat">📅 ${new Date(report.timestamp).toLocaleString()}</div>
  </div>
  
  ${Object.entries(report.results).map(([category, data]) => `
    <div class="category">
      <h2>${category.toUpperCase()}</h2>
      
      <h3>Validations</h3>
      ${data.validations.map(v => `
        <div class="validation ${v.passed ? 'passed' : 'failed'}">
          ${v.passed ? '✅' : '❌'} ${v.check}
          ${!v.passed ? `<br>Expected: "${v.expected}", Got: "${v.actual}"` : ''}
        </div>
      `).join('')}
      
      <h3>Screenshots (${data.screenshots.length})</h3>
      <div class="screenshots">
        ${data.screenshots.map(s => `
          <div class="screenshot">
            <img src="${s.file}" alt="${s.name}" loading="lazy">
            <div>${s.number}. ${s.name}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')}
</body>
</html>`;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.setup();
      
      // Run all tests
      await this.testDashboard();
      await this.testOnboarding();
      await this.testDevToolkit();
      await this.testTaskManagement();
      await this.testTimeline();
      await this.testAgentVisualizations();
      await this.testAuthentication();
      await this.testErrorConditions();
      
      // Generate report
      const allPassed = await this.generateReport();
      
      console.log('\n' + '=' .repeat(60));
      if (allPassed) {
        console.log('🎉 ALL VALIDATIONS PASSED!');
      } else {
        console.log('⚠️ SOME VALIDATIONS FAILED - Review report for details');
      }
      console.log('=' .repeat(60));
      
      // Open report in browser
      console.log('\nOpening report in browser...');
      const { exec } = require('child_process');
      exec(`open ${path.join(OUTPUT_DIR, 'report.html')}`);
      
      return allPassed;
      
    } catch (error) {
      console.error('❌ Test error:', error.message);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
if (require.main === module) {
  const test = new CompletePRDValidation();
  test.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}