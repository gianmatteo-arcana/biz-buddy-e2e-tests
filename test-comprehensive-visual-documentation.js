const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

/**
 * COMPREHENSIVE VISUAL DOCUMENTATION E2E TEST
 * 
 * This test captures EVERY UI state and interaction:
 * 1. User Dashboard views and cards
 * 2. Dev Toolkit standalone window
 * 3. Agent interactions and TaskContext updates
 * 4. User prompts and questions triggered by agents
 * 
 * Each screenshot is evaluated and documented.
 */

class VisualDocumentationTest {
  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.testDir = path.join(__dirname, `visual-documentation-${this.timestamp}`);
    this.screenshots = [];
    this.evaluations = {};
  }

  async setup() {
    await fs.mkdir(this.testDir, { recursive: true });
    await fs.mkdir(path.join(this.testDir, '01-user-dashboard'), { recursive: true });
    await fs.mkdir(path.join(this.testDir, '02-task-cards'), { recursive: true });
    await fs.mkdir(path.join(this.testDir, '03-dev-toolkit'), { recursive: true });
    await fs.mkdir(path.join(this.testDir, '04-agent-interactions'), { recursive: true });
    await fs.mkdir(path.join(this.testDir, '05-task-context-changes'), { recursive: true });
    await fs.mkdir(path.join(this.testDir, '06-user-prompts'), { recursive: true });
    
    console.log('📁 Test directory created:', this.testDir);
  }

  async captureAndEvaluate(page, category, name, description) {
    const filename = `${String(this.screenshots.length + 1).padStart(3, '0')}-${name}.png`;
    const filepath = path.join(this.testDir, category, filename);
    
    await page.screenshot({ 
      path: filepath,
      fullPage: true 
    });
    
    this.screenshots.push({
      category,
      name,
      filename,
      description,
      timestamp: new Date().toISOString()
    });
    
    // Evaluate the screenshot
    const evaluation = await this.evaluateScreenshot(page, name, description);
    this.evaluations[filename] = evaluation;
    
    console.log(`📸 Captured: ${category}/${filename}`);
    console.log(`   📝 ${description}`);
    console.log(`   ✅ Evaluation: ${evaluation.summary}`);
    
    return evaluation;
  }

  async evaluateScreenshot(page, name, description) {
    const content = await page.textContent('body');
    const url = page.url();
    
    const evaluation = {
      name,
      description,
      url,
      timestamp: new Date().toISOString(),
      checks: {},
      issues: [],
      summary: ''
    };
    
    // Check for common UI elements
    evaluation.checks.hasAuthentication = content.includes('Authenticated') || content.includes('Welcome');
    evaluation.checks.hasNavigation = await page.locator('nav, [role="navigation"]').count() > 0;
    evaluation.checks.hasContent = content.length > 100;
    evaluation.checks.hasInteractiveElements = await page.locator('button, input, select, textarea').count() > 0;
    
    // Check for errors
    if (content.includes('Not Found') || content.includes('404')) {
      evaluation.issues.push('Page not found');
    }
    if (content.includes('Error') || content.includes('error')) {
      evaluation.issues.push('Error message detected');
    }
    if (content.includes('Loading') && !content.includes('loaded')) {
      evaluation.issues.push('Page still loading');
    }
    
    // Generate summary
    if (evaluation.issues.length > 0) {
      evaluation.summary = `Issues found: ${evaluation.issues.join(', ')}`;
    } else if (Object.values(evaluation.checks).every(v => v)) {
      evaluation.summary = 'All checks passed - UI fully functional';
    } else {
      const failed = Object.entries(evaluation.checks)
        .filter(([k, v]) => !v)
        .map(([k]) => k);
      evaluation.summary = `Missing: ${failed.join(', ')}`;
    }
    
    return evaluation;
  }

  async run() {
    console.log('🚀 Starting Comprehensive Visual Documentation Test');
    console.log('=' .repeat(70));
    
    await this.setup();
    
    const browser = await chromium.launch({ 
      headless: false,
      slowMo: 500 
    });
    
    try {
      const context = await browser.newContext({
        storageState: '.auth/user-state.json',
        viewport: { width: 1400, height: 900 }
      });
      
      const page = await context.newPage();
      
      // ========================================
      // SECTION 1: USER DASHBOARD
      // ========================================
      console.log('\n📍 SECTION 1: USER DASHBOARD');
      console.log('-'.repeat(50));
      
      // Try multiple URLs to find working deployment
      const urls = [
        'http://localhost:5173',
        'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com',
        'https://thirsty-party-9a3a96.lovableproject.com'
      ];
      
      let appLoaded = false;
      for (const url of urls) {
        try {
          console.log(`🔍 Trying ${url}...`);
          await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
          
          const content = await page.textContent('body');
          if (!content.includes('Not Found') && content.length > 100) {
            appLoaded = true;
            console.log('✅ App loaded successfully');
            break;
          }
        } catch (e) {
          console.log(`❌ Failed to load ${url}`);
        }
      }
      
      // 1.1 Initial landing page
      await this.captureAndEvaluate(
        page,
        '01-user-dashboard',
        'landing-page',
        'Initial landing page - Should show welcome message or sign-in prompt'
      );
      
      // 1.2 After authentication
      if (appLoaded) {
        await page.waitForTimeout(2000);
        
        await this.captureAndEvaluate(
          page,
          '01-user-dashboard',
          'authenticated-dashboard',
          'Dashboard after authentication - Should show user profile and task overview'
        );
        
        // 1.3 Check for user profile card
        const hasProfile = await page.locator('[data-testid="user-profile"], .user-profile').count() > 0;
        if (hasProfile) {
          await this.captureAndEvaluate(
            page,
            '01-user-dashboard',
            'user-profile-card',
            'User profile card - Should display name, email, and avatar'
          );
        }
        
        // 1.4 Check for welcome message
        const hasWelcome = await page.locator('text=/Welcome|Hello/i').count() > 0;
        if (hasWelcome) {
          await this.captureAndEvaluate(
            page,
            '01-user-dashboard',
            'welcome-message',
            'Welcome message - Personalized greeting for authenticated user'
          );
        }
      }
      
      // ========================================
      // SECTION 2: TASK CARDS
      // ========================================
      console.log('\n📍 SECTION 2: TASK CARDS');
      console.log('-'.repeat(50));
      
      // 2.1 Look for task cards
      const taskCards = await page.locator('[data-testid*="task"], .task-card, [class*="task"]').all();
      console.log(`Found ${taskCards.length} potential task cards`);
      
      for (let i = 0; i < Math.min(taskCards.length, 5); i++) {
        await taskCards[i].scrollIntoViewIfNeeded();
        await this.captureAndEvaluate(
          page,
          '02-task-cards',
          `task-card-${i + 1}`,
          `Task card #${i + 1} - Should show task title, status, and actions`
        );
        
        // Try to hover for more details
        await taskCards[i].hover();
        await page.waitForTimeout(500);
        
        await this.captureAndEvaluate(
          page,
          '02-task-cards',
          `task-card-${i + 1}-hover`,
          `Task card #${i + 1} on hover - May show additional details or actions`
        );
      }
      
      // 2.2 Try to create a new task
      const newTaskButton = await page.locator('button:has-text("New Task"), button:has-text("Create Task"), button:has-text("Add Task")').first();
      if (await newTaskButton.isVisible()) {
        await newTaskButton.click();
        await page.waitForTimeout(1000);
        
        await this.captureAndEvaluate(
          page,
          '02-task-cards',
          'new-task-modal',
          'New task creation modal - Should show form fields for task details'
        );
        
        // Close modal if opened
        const closeButton = await page.locator('button[aria-label="Close"], button:has-text("Cancel")').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
      
      // ========================================
      // SECTION 3: DEV TOOLKIT STANDALONE
      // ========================================
      console.log('\n📍 SECTION 3: DEV TOOLKIT STANDALONE');
      console.log('-'.repeat(50));
      
      // Navigate to Dev Toolkit
      const devToolkitUrls = [
        '/dev-toolkit-standalone',
        '/dev-toolkit',
        '/dev'
      ];
      
      for (const path of devToolkitUrls) {
        try {
          await page.goto(page.url().split('/').slice(0, 3).join('/') + path);
          await page.waitForTimeout(2000);
          
          const content = await page.textContent('body');
          if (content.includes('Dev Toolkit') || content.includes('Developer')) {
            console.log(`✅ Dev Toolkit loaded at ${path}`);
            break;
          }
        } catch (e) {
          console.log(`❌ Dev Toolkit not found at ${path}`);
        }
      }
      
      // 3.1 Dev Toolkit main view
      await this.captureAndEvaluate(
        page,
        '03-dev-toolkit',
        'main-view',
        'Dev Toolkit main view - Should show tabs for different developer tools'
      );
      
      // 3.2 Agent Visualizer tab
      const agentTab = await page.locator('text=Agent Visualizer, text=Agents, text=Visualizer').first();
      if (await agentTab.isVisible()) {
        await agentTab.click();
        await page.waitForTimeout(1000);
        
        await this.captureAndEvaluate(
          page,
          '03-dev-toolkit',
          'agent-visualizer',
          'Agent Visualizer - Shows real-time agent activity and interactions'
        );
      }
      
      // 3.3 Console tab
      const consoleTab = await page.locator('text=Console').first();
      if (await consoleTab.isVisible()) {
        await consoleTab.click();
        await page.waitForTimeout(1000);
        
        await this.captureAndEvaluate(
          page,
          '03-dev-toolkit',
          'console-view',
          'Console view - Shows system logs and debugging information'
        );
      }
      
      // 3.4 Task History tab
      const historyTab = await page.locator('text=Task History, text=History').first();
      if (await historyTab.isVisible()) {
        await historyTab.click();
        await page.waitForTimeout(1000);
        
        await this.captureAndEvaluate(
          page,
          '03-dev-toolkit',
          'task-history',
          'Task History - Shows chronological list of all task events'
        );
      }
      
      // 3.5 Migrations tab
      const migrationsTab = await page.locator('text=Migrations').first();
      if (await migrationsTab.isVisible()) {
        await migrationsTab.click();
        await page.waitForTimeout(1000);
        
        await this.captureAndEvaluate(
          page,
          '03-dev-toolkit',
          'migrations-panel',
          'Migrations panel - Shows pending and applied database migrations'
        );
      }
      
      // ========================================
      // SECTION 4: AGENT INTERACTIONS
      // ========================================
      console.log('\n📍 SECTION 4: AGENT INTERACTIONS');
      console.log('-'.repeat(50));
      
      // Go back to Agent Visualizer
      const agentTab2 = await page.locator('text=Agent Visualizer, text=Agents, text=Visualizer').first();
      if (await agentTab2.isVisible()) {
        await agentTab2.click();
        await page.waitForTimeout(1000);
      }
      
      // 4.1 Start a new onboarding flow to trigger agents
      const startButton = await page.locator('button:has-text("Start"), button:has-text("Begin"), button:has-text("New Onboarding")').first();
      if (await startButton.isVisible()) {
        await startButton.click();
        await page.waitForTimeout(2000);
        
        await this.captureAndEvaluate(
          page,
          '04-agent-interactions',
          'onboarding-started',
          'Onboarding flow started - Agents should begin orchestrating'
        );
        
        // 4.2 Capture agent timeline
        await page.waitForTimeout(3000);
        await this.captureAndEvaluate(
          page,
          '04-agent-interactions',
          'agent-timeline',
          'Agent timeline - Shows sequence of agent activations'
        );
        
        // 4.3 Look for agent cards
        const agentCards = await page.locator('[data-testid*="agent"], .agent-card').all();
        for (let i = 0; i < Math.min(agentCards.length, 3); i++) {
          await agentCards[i].scrollIntoViewIfNeeded();
          await this.captureAndEvaluate(
            page,
            '04-agent-interactions',
            `agent-${i + 1}-active`,
            `Agent #${i + 1} active state - Shows agent reasoning and actions`
          );
        }
      }
      
      // ========================================
      // SECTION 5: TASK CONTEXT CHANGES
      // ========================================
      console.log('\n📍 SECTION 5: TASK CONTEXT CHANGES');
      console.log('-'.repeat(50));
      
      // 5.1 Look for context inspector
      const contextInspector = await page.locator('[data-testid="context-inspector"], .context-inspector').first();
      if (await contextInspector.isVisible()) {
        await this.captureAndEvaluate(
          page,
          '05-task-context-changes',
          'context-initial',
          'Initial TaskContext state - Shows empty or minimal context'
        );
        
        // 5.2 After agent updates
        await page.waitForTimeout(3000);
        await this.captureAndEvaluate(
          page,
          '05-task-context-changes',
          'context-after-agents',
          'TaskContext after agent updates - Should show enriched data'
        );
        
        // 5.3 Context diff view
        const diffButton = await page.locator('button:has-text("Diff"), button:has-text("Changes")').first();
        if (await diffButton.isVisible()) {
          await diffButton.click();
          await page.waitForTimeout(1000);
          
          await this.captureAndEvaluate(
            page,
            '05-task-context-changes',
            'context-diff',
            'Context diff view - Shows before/after comparison'
          );
        }
      }
      
      // ========================================
      // SECTION 6: USER PROMPTS
      // ========================================
      console.log('\n📍 SECTION 6: USER PROMPTS TRIGGERED BY AGENTS');
      console.log('-'.repeat(50));
      
      // Navigate back to main app
      await page.goto(urls[0]);
      await page.waitForTimeout(2000);
      
      // 6.1 Check for agent-triggered prompts
      const prompts = await page.locator('[role="dialog"], .modal, .prompt, [data-testid*="prompt"]').all();
      for (let i = 0; i < Math.min(prompts.length, 3); i++) {
        await this.captureAndEvaluate(
          page,
          '06-user-prompts',
          `prompt-${i + 1}`,
          `User prompt #${i + 1} - Agent requesting user input`
        );
      }
      
      // 6.2 Check for questions in the UI
      const questions = await page.locator('text=/?/i').all();
      if (questions.length > 0) {
        await this.captureAndEvaluate(
          page,
          '06-user-prompts',
          'agent-questions',
          'Agent-generated questions - Agents asking for clarification'
        );
      }
      
      // 6.3 Check for form fields added by agents
      const formFields = await page.locator('input:visible, select:visible, textarea:visible').all();
      if (formFields.length > 0) {
        await this.captureAndEvaluate(
          page,
          '06-user-prompts',
          'agent-form-fields',
          'Form fields added by agents - Dynamic UI generation'
        );
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      
      // Capture error state
      if (page) {
        await this.captureAndEvaluate(
          page,
          '01-user-dashboard',
          'error-state',
          `Error state: ${error.message}`
        );
      }
    } finally {
      await browser.close();
    }
    
    // Generate comprehensive report
    await this.generateReport();
  }
  
  async generateReport() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 COMPREHENSIVE VISUAL DOCUMENTATION REPORT');
    console.log('='.repeat(70));
    
    const report = {
      timestamp: this.timestamp,
      testDirectory: this.testDir,
      totalScreenshots: this.screenshots.length,
      categories: {},
      evaluations: this.evaluations,
      summary: {
        successful: [],
        issues: [],
        recommendations: []
      }
    };
    
    // Group screenshots by category
    for (const screenshot of this.screenshots) {
      if (!report.categories[screenshot.category]) {
        report.categories[screenshot.category] = [];
      }
      report.categories[screenshot.category].push(screenshot);
    }
    
    // Analyze evaluations
    for (const [filename, evaluation] of Object.entries(this.evaluations)) {
      if (evaluation.issues.length === 0) {
        report.summary.successful.push(`✅ ${evaluation.name}: ${evaluation.summary}`);
      } else {
        report.summary.issues.push(`❌ ${evaluation.name}: ${evaluation.issues.join(', ')}`);
      }
    }
    
    // Generate recommendations
    if (report.summary.issues.some(i => i.includes('Not Found'))) {
      report.summary.recommendations.push('🔧 Deploy application to accessible URL');
    }
    if (report.summary.issues.some(i => i.includes('Loading'))) {
      report.summary.recommendations.push('⚡ Optimize loading performance');
    }
    if (report.summary.issues.some(i => i.includes('Error'))) {
      report.summary.recommendations.push('🐛 Fix error states before production');
    }
    
    // Print summary
    console.log('\n📁 Test Directory:', this.testDir);
    console.log('📸 Total Screenshots:', this.screenshots.length);
    
    console.log('\n✅ SUCCESSFUL CAPTURES:');
    report.summary.successful.forEach(s => console.log('  ', s));
    
    if (report.summary.issues.length > 0) {
      console.log('\n❌ ISSUES FOUND:');
      report.summary.issues.forEach(i => console.log('  ', i));
    }
    
    if (report.summary.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.summary.recommendations.forEach(r => console.log('  ', r));
    }
    
    // Save detailed report
    await fs.writeFile(
      path.join(this.testDir, 'VISUAL_DOCUMENTATION_REPORT.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Generate markdown documentation
    const markdown = this.generateMarkdown(report);
    await fs.writeFile(
      path.join(this.testDir, 'VISUAL_DOCUMENTATION.md'),
      markdown
    );
    
    console.log('\n📄 Reports saved:');
    console.log('   - VISUAL_DOCUMENTATION_REPORT.json');
    console.log('   - VISUAL_DOCUMENTATION.md');
    
    return report;
  }
  
  generateMarkdown(report) {
    let md = `# Visual Documentation Report\n\n`;
    md += `Generated: ${new Date(this.timestamp).toLocaleString()}\n\n`;
    md += `## Summary\n\n`;
    md += `- **Total Screenshots:** ${report.totalScreenshots}\n`;
    md += `- **Successful Captures:** ${report.summary.successful.length}\n`;
    md += `- **Issues Found:** ${report.summary.issues.length}\n\n`;
    
    md += `## Screenshots by Category\n\n`;
    
    for (const [category, screenshots] of Object.entries(report.categories)) {
      md += `### ${category.replace(/-/g, ' ').toUpperCase()}\n\n`;
      
      for (const screenshot of screenshots) {
        const evaluation = this.evaluations[screenshot.filename];
        md += `#### ${screenshot.name}\n\n`;
        md += `- **File:** ${screenshot.filename}\n`;
        md += `- **Description:** ${screenshot.description}\n`;
        md += `- **Evaluation:** ${evaluation.summary}\n`;
        md += `- **Timestamp:** ${screenshot.timestamp}\n\n`;
        
        if (evaluation.issues.length > 0) {
          md += `**Issues:**\n`;
          evaluation.issues.forEach(issue => {
            md += `- ⚠️ ${issue}\n`;
          });
          md += '\n';
        }
      }
    }
    
    if (report.summary.recommendations.length > 0) {
      md += `## Recommendations\n\n`;
      report.summary.recommendations.forEach(rec => {
        md += `- ${rec}\n`;
      });
    }
    
    return md;
  }
}

// Run the comprehensive visual documentation test
const test = new VisualDocumentationTest();
test.run().catch(console.error);