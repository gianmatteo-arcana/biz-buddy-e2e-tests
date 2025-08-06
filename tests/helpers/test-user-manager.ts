/**
 * Test User Manager - Handles test user allocation and cleanup
 * 
 * Security: This only works with pre-defined test accounts
 * No database access or user deletion capabilities
 */

export interface TestUser {
  email: string;
  password: string;
  displayName: string;
  isAvailable: boolean;
  lastUsed?: Date;
}

export class TestUserManager {
  private static instance: TestUserManager;
  private testUsers: Map<string, TestUser> = new Map();
  
  constructor() {
    // Initialize with test users from environment
    this.loadTestUsers();
  }
  
  static getInstance(): TestUserManager {
    if (!TestUserManager.instance) {
      TestUserManager.instance = new TestUserManager();
    }
    return TestUserManager.instance;
  }
  
  private loadTestUsers(): void {
    // In a real implementation, load from secure config
    // For now, using environment variables
    const testUsersJson = process.env.TEST_USERS_CONFIG;
    
    if (!testUsersJson) {
      console.warn('No TEST_USERS_CONFIG found, using defaults');
      // Default test users (would be in .env.test)
      this.testUsers.set('test1', {
        email: 'bizbuddy.test.1@gmail.com',
        password: process.env.TEST_USER_1_PASSWORD || '',
        displayName: 'Test User 1',
        isAvailable: true,
      });
    } else {
      const users = JSON.parse(testUsersJson);
      users.forEach((user: TestUser) => {
        this.testUsers.set(user.email, user);
      });
    }
  }
  
  async acquireTestUser(): Promise<TestUser | null> {
    // Find an available test user
    for (const [email, user] of this.testUsers) {
      if (user.isAvailable) {
        user.isAvailable = false;
        user.lastUsed = new Date();
        
        // In production, this would update a shared state (Redis, etc)
        console.log(`Acquired test user: ${email}`);
        return user;
      }
    }
    
    return null;
  }
  
  async releaseTestUser(email: string): Promise<void> {
    const user = this.testUsers.get(email);
    if (user) {
      user.isAvailable = true;
      console.log(`Released test user: ${email}`);
      
      // Mark for cleanup
      await this.markForCleanup(email);
    }
  }
  
  private async markForCleanup(email: string): Promise<void> {
    // In production, this would:
    // 1. Add to cleanup queue
    // 2. Trigger cleanup job
    // 3. Log the action
    
    console.log(`Marked for cleanup: ${email}`);
    
    // Could write to a file for batch processing
    const fs = require('fs').promises;
    const cleanupLog = `./test-results/cleanup-queue.json`;
    
    try {
      const existing = await fs.readFile(cleanupLog, 'utf-8')
        .then(JSON.parse)
        .catch(() => []);
      
      existing.push({
        email,
        markedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      });
      
      await fs.writeFile(cleanupLog, JSON.stringify(existing, null, 2));
    } catch (error) {
      console.error('Failed to mark for cleanup:', error);
    }
  }
  
  async getCleanupQueue(): Promise<any[]> {
    const fs = require('fs').promises;
    const cleanupLog = `./test-results/cleanup-queue.json`;
    
    try {
      const data = await fs.readFile(cleanupLog, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
}

// Helper function for tests
export async function withTestUser<T>(
  testFn: (user: TestUser) => Promise<T>
): Promise<T> {
  const manager = TestUserManager.getInstance();
  const user = await manager.acquireTestUser();
  
  if (!user) {
    throw new Error('No test users available');
  }
  
  try {
    return await testFn(user);
  } finally {
    await manager.releaseTestUser(user.email);
  }
}