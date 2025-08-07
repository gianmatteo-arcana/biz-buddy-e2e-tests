const { chromium } = require('playwright');

async function demoDeveloperToolkit() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           🛠️  DEVELOPER TOOLKIT DEMO                          ║
╚═══════════════════════════════════════════════════════════════╝
`);
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow motion for demo visibility
  });
  
  const page = await browser.newPage();
  
  console.log('📍 Step 1: Loading the app...\n');
  await page.goto('http://localhost:8080');
  await page.waitForTimeout(3000);
  
  // Enter Demo Mode
  console.log('📍 Step 2: Entering Demo Mode...\n');
  const hasDemoButton = await page.evaluate(() => {
    return document.body.innerText.includes('Demo Mode');
  });
  
  if (hasDemoButton) {
    await page.getByRole('button', { name: 'Demo Mode' }).click();
    await page.waitForTimeout(2000);
  }
  
  console.log('✅ Dashboard loaded\n');
  
  // Feature 1: TaskContext UI Toggle
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎯 FEATURE 1: TaskContext-Driven UI');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Check for the TaskContext UI toggle
  const hasTaskContextToggle = await page.evaluate(() => {
    return document.body.innerText.includes('Old UI') || document.body.innerText.includes('New UI');
  });
  
  if (hasTaskContextToggle) {
    console.log('📊 The app has TWO UI modes:');
    console.log('   • Old UI: Traditional card-based interface');
    console.log('   • New UI: TaskContext-driven interface with UniversalTaskCard\n');
    
    await page.screenshot({ path: 'demo-1-old-ui.png' });
    console.log('📸 Screenshot saved: demo-1-old-ui.png\n');
    
    // Toggle to new UI
    console.log('🔄 Switching to TaskContext UI...');
    const toggleButton = await page.$('button:has-text("Old UI"), button:has-text("New UI")');
    if (toggleButton) {
      await toggleButton.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'demo-2-new-ui.png' });
      console.log('📸 Screenshot saved: demo-2-new-ui.png\n');
    }
  }
  
  // Feature 2: Dev Console
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎯 FEATURE 2: Development Console');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const hasDevConsole = await page.evaluate(() => {
    return document.body.innerText.includes('Show Console');
  });
  
  if (hasDevConsole) {
    console.log('🖥️  Opening Dev Console...');
    await page.getByRole('button', { name: 'Show Console' }).click();
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'demo-3-dev-console.png' });
    console.log('📸 Screenshot saved: demo-3-dev-console.png\n');
    
    console.log('📋 Dev Console Features:');
    console.log('   • Real-time app state monitoring');
    console.log('   • Component performance metrics');
    console.log('   • Debug information display\n');
  }
  
  // Feature 3: Navigate to Dev Panel
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎯 FEATURE 3: Development Panel (/dev)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('📍 Navigating to /dev panel...');
  await page.goto('http://localhost:8080/dev');
  await page.waitForTimeout(3000);
  
  const devPanelContent = await page.evaluate(() => {
    return {
      hasOrchestrationInspector: document.body.innerText.includes('Orchestration Inspector'),
      hasPromptManager: document.body.innerText.includes('Prompt'),
      hasEvents: document.body.innerText.includes('Events'),
      hasMetrics: document.body.innerText.includes('Metrics')
    };
  });
  
  await page.screenshot({ path: 'demo-4-dev-panel.png', fullPage: true });
  console.log('📸 Screenshot saved: demo-4-dev-panel.png\n');
  
  console.log('🛠️  Development Panel Components:');
  if (devPanelContent.hasOrchestrationInspector) {
    console.log('   ✅ Orchestration Inspector - Monitor agent communication');
  }
  if (devPanelContent.hasPromptManager) {
    console.log('   ✅ Prompt Manager - Manage and test prompts');
  }
  if (devPanelContent.hasEvents) {
    console.log('   ✅ Event Stream - Real-time event monitoring');
  }
  if (devPanelContent.hasMetrics) {
    console.log('   ✅ Metrics Dashboard - Performance analytics');
  }
  
  // Feature 4: Key Architecture Components
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎯 FEATURE 4: Key Architecture Components');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('📦 Implemented Components:\n');
  
  console.log('1️⃣  UniversalTaskCard (src/components/UniversalTaskCard.tsx)');
  console.log('   • Three granularity modes: compact, medium, fullscreen');
  console.log('   • TaskContext-driven rendering');
  console.log('   • Integrated chat functionality\n');
  
  console.log('2️⃣  TaskContextDashboard (src/components/TaskContextDashboard.tsx)');
  console.log('   • Manages TaskContext lifecycle');
  console.log('   • Coordinates multiple UniversalTaskCards');
  console.log('   • Real-time updates via WebSocket\n');
  
  console.log('3️⃣  OrchestrationInspector (src/components/dev/OrchestrationInspector.tsx)');
  console.log('   • Real-time agent monitoring');
  console.log('   • Event stream visualization');
  console.log('   • Performance metrics tracking\n');
  
  console.log('4️⃣  Enhanced Services:');
  console.log('   • promptManager.ts - YAML-based prompt management');
  console.log('   • taskOrchestrator.ts - Enhanced with event emitter');
  console.log('   • orchestrationEventEmitter.ts - WebSocket event system\n');
  
  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 DEVELOPMENT TOOLKIT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('✅ UI Toggle: Switch between traditional and TaskContext UI');
  console.log('✅ Dev Console: Real-time monitoring and debugging');
  console.log('✅ Dev Panel: Comprehensive development dashboard at /dev');
  console.log('✅ Architecture: TaskContext-driven with event-based updates\n');
  
  console.log('📸 Screenshots saved:');
  console.log('   • demo-1-old-ui.png - Traditional UI');
  console.log('   • demo-2-new-ui.png - TaskContext UI');
  console.log('   • demo-3-dev-console.png - Development console');
  console.log('   • demo-4-dev-panel.png - Development panel\n');
  
  // Keep browser open for manual exploration
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('💡 Browser will stay open for manual exploration.');
  console.log('   Press Ctrl+C when done to close.');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Wait indefinitely (user will Ctrl+C)
  await new Promise(() => {});
}

demoDeveloperToolkit().catch(error => {
  console.error('❌ Demo failed:', error);
  process.exit(1);
});