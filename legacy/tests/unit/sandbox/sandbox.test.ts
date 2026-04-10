import { describe, it, expect, beforeAll } from 'vitest';

// Sandbox tests require isolated-vm native module which may not work in all environments
let sandboxAvailable = false;
let createSandbox: typeof import('../../../src/core/sandbox.js').createSandbox;
let executeSandboxed: typeof import('../../../src/core/sandbox.js').executeSandboxed;

beforeAll(async () => {
  try {
    const module = await import('../../../src/core/sandbox.js');
    createSandbox = module.createSandbox;
    executeSandboxed = module.executeSandboxed;
    sandboxAvailable = true;
  } catch {
    console.warn('Sandbox tests skipped: isolated-vm native module not available');
  }
});

describe('Sandbox Execution', () => {
  it.skipIf(!sandboxAvailable)('should create a sandbox instance', () => {
    const sandbox = createSandbox();
    expect(sandbox).toBeDefined();
  });

  it.skipIf(!sandboxAvailable)('should execute valid code in sandbox', async () => {
    const code = `
      const result = 1 + 1;
      result;
    `;

    const result = await executeSandboxed(code);

    expect(result.success).toBe(true);
  });

  it.skipIf(!sandboxAvailable)('should block access to fs module', async () => {
    const code = `
      const fs = require('fs');
      fs.readFileSync('/etc/passwd');
    `;

    const result = await executeSandboxed(code);

    expect(result.success).toBe(false);
    expect(result.error).toContain('require');
  });

  it.skipIf(!sandboxAvailable)('should block access to child_process', async () => {
    const code = `
      const { exec } = require('child_process');
      exec('ls');
    `;

    const result = await executeSandboxed(code);

    expect(result.success).toBe(false);
  });

  it.skipIf(!sandboxAvailable)('should respect timeout limits', async () => {
    const code = `
      while(true) {}
    `;

    const result = await executeSandboxed(code, { timeoutMs: 100 });

    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  }, 5000);

  it.skipIf(!sandboxAvailable)('should provide blessed API in sandbox', async () => {
    const code = `
      const blessed = require('blessed');
      typeof blessed.box === 'function';
    `;

    const result = await executeSandboxed(code);

    expect(result.success).toBe(true);
  });
});
