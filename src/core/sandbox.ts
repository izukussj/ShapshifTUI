/**
 * Sandboxed code execution using isolated-vm
 */

import ivm from 'isolated-vm';
import type { SandboxConfig } from '../specs-types.js';

/**
 * Default sandbox configuration
 */
const DEFAULT_CONFIG: Required<SandboxConfig> = {
  memoryLimitMB: 64,
  timeoutMs: 5000,
};

/**
 * Result of sandboxed execution
 */
export interface SandboxResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Sandbox instance for code execution
 */
export interface Sandbox {
  execute(code: string): Promise<SandboxResult>;
  dispose(): void;
}

/**
 * Create a new sandbox instance
 */
export function createSandbox(config?: SandboxConfig): Sandbox {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const isolate = new ivm.Isolate({
    memoryLimit: mergedConfig.memoryLimitMB,
  });

  return {
    async execute(code: string): Promise<SandboxResult> {
      try {
        const context = await isolate.createContext();

        // Set up the sandbox environment
        const jail = context.global;

        // Provide a limited require function that only allows 'blessed'
        await jail.set('global', jail.derefInto());

        // Create a mock blessed object for validation
        // In real execution, we'll inject the actual blessed reference
        const mockBlessed = `{
          screen: function(opts) { return { append: function() {}, render: function() {}, key: function() {} }; },
          box: function(opts) { return { on: function() {}, setContent: function() {} }; },
          text: function(opts) { return { on: function() {} }; },
          list: function(opts) { return { on: function() {}, focus: function() {} }; },
          table: function(opts) { return { on: function() {} }; },
          form: function(opts) { return { on: function() {}, submit: function() {} }; },
          input: function(opts) { return { on: function() {}, focus: function() {} }; },
          button: function(opts) { return { on: function() {} }; },
          textarea: function(opts) { return { on: function() {} }; },
          checkbox: function(opts) { return { on: function() {} }; },
          radioset: function(opts) { return { on: function() {} }; },
          progressbar: function(opts) { return { on: function() {} }; }
        }`;

        // Mock require that only allows blessed
        await context.eval(`
          const __blessedMock = ${mockBlessed};
          globalThis.require = function(module) {
            if (module === 'blessed') {
              return __blessedMock;
            }
            throw new Error('require("' + module + '") is not allowed. Only require("blessed") is permitted.');
          };

          // Mock process for exit handlers only
          globalThis.process = {
            exit: function(code) {
              // No-op in sandbox
            },
            stdout: {},
            stdin: {}
          };
        `);

        // Execute the code with timeout
        const script = await isolate.compileScript(code);
        const result = await script.run(context, {
          timeout: mergedConfig.timeoutMs,
        });

        return {
          success: true,
          result,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check for specific error types
        if (errorMessage.includes('Script execution timed out')) {
          return {
            success: false,
            error: 'Code execution timeout - infinite loop or long-running operation detected',
          };
        }

        if (errorMessage.includes('require')) {
          return {
            success: false,
            error: errorMessage,
          };
        }

        return {
          success: false,
          error: `Sandbox execution error: ${errorMessage}`,
        };
      }
    },

    dispose(): void {
      isolate.dispose();
    },
  };
}

/**
 * Execute code in a one-time sandbox
 */
export async function executeSandboxed(
  code: string,
  config?: SandboxConfig
): Promise<SandboxResult> {
  const sandbox = createSandbox(config);
  try {
    return await sandbox.execute(code);
  } finally {
    sandbox.dispose();
  }
}
