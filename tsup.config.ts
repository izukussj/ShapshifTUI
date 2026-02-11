import { defineConfig } from 'tsup';

export default defineConfig([
  // CLI build
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: false,
    sourcemap: true,
    clean: true,
    target: 'node18',
    outDir: 'dist',
    external: ['blessed', 'blessed-contrib', 'ws', 'ajv', 'fast-json-patch'],
    // Shebang is handled by the source file itself
  },
  // Library build
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: false,
    target: 'node18',
    outDir: 'dist',
    external: ['blessed', 'blessed-contrib', 'ws', 'ajv', 'fast-json-patch'],
  },
]);
