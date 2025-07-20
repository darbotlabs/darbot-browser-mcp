import { test, expect } from '@playwright/test';
import { MemoryManager, LocalMemoryStorage } from '../src/memory';

test.describe('Memory System', () => {
  test('should generate consistent state hashes', async () => {
    const domSnapshot1 = '<html><body><h1>Test Page</h1></body></html>';
    const domSnapshot2 = '<html><body><h1>Test Page</h1></body></html>';
    const domSnapshot3 = '<html><body><h1>Different Page</h1></body></html>';

    const hash1 = MemoryManager.stateHash(domSnapshot1);
    const hash2 = MemoryManager.stateHash(domSnapshot2);
    const hash3 = MemoryManager.stateHash(domSnapshot3);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1).toMatch(/^[a-f0-9]{16}$/);
  });

  test('should store and retrieve states', async () => {
    const storage = new LocalMemoryStorage({ storagePath: '/tmp/test-memory' });
    
    const url = 'https://example.com';
    const title = 'Example Page';
    const domSnapshot = '<html><body><h1>Test</h1></body></html>';
    const links = ['https://example.com/page1', 'https://example.com/page2'];

    const memory = new MemoryManager({ enabled: true, connector: 'local' });
    const stateHash = await memory.storeState(url, title, domSnapshot, undefined, links);

    expect(stateHash).toMatch(/^[a-f0-9]{16}$/);

    const hasState = await memory.hasState(domSnapshot);
    expect(hasState).toBe(true);

    const retrievedState = await memory.getState(stateHash);
    expect(retrievedState).toBeTruthy();
    expect(retrievedState!.url).toBe(url);
    expect(retrievedState!.title).toBe(title);
    expect(retrievedState!.links).toEqual(links);
  });

  test('should handle disabled memory gracefully', async () => {
    const memory = new MemoryManager({ enabled: false });
    
    const stateHash = await memory.storeState('http://test.com', 'Test', '<html></html>');
    expect(stateHash).toBe('');

    const hasState = await memory.hasState('<html></html>');
    expect(hasState).toBe(false);

    const states = await memory.getAllStates();
    expect(states).toHaveLength(0);
  });
});

test.describe('Autonomous Tools', () => {
  test('should configure autonomous crawling', async () => {
    // This would test the tool configuration
    // For now, just verify the tool exports exist
    const { default: autonomousTools } = await import('../src/tools/autonomous');
    
    expect(autonomousTools).toBeDefined();
    expect(autonomousTools).toHaveLength(2); // browserStartAutonomousCrawl, browserConfigureMemory
    
    const toolNames = autonomousTools.map(tool => tool.schema.name);
    expect(toolNames).toContain('browser_start_autonomous_crawl');
    expect(toolNames).toContain('browser_configure_memory');
  });

  test('should validate autonomous crawl parameters', async () => {
    const { browserStartAutonomousCrawl } = await import('../src/tools/autonomous');
    
    const schema = browserStartAutonomousCrawl.schema.inputSchema;
    
    // Valid parameters
    const validParams = {
      startUrl: 'https://example.com',
      maxDepth: 3,
      maxPages: 50,
      memoryEnabled: true
    };
    
    const result = schema.safeParse(validParams);
    expect(result.success).toBe(true);
    
    // Invalid URL
    const invalidParams = {
      startUrl: 'not-a-url',
      maxDepth: 3
    };
    
    const invalidResult = schema.safeParse(invalidParams);
    expect(invalidResult.success).toBe(false);
  });
});