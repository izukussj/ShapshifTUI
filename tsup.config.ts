import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { cli: 'src/cli.tsx' },
    format: ['esm'],
    sourcemap: true,
    clean: true,
    target: 'node20',
    outDir: 'dist',
    external: ['react', 'ink', 'ink-text-input', 'esbuild', 'ws'],
    banner: { js: '#!/usr/bin/env node' },
  },
  {
    entry: { sandbox: 'src/sandbox.ts' },
    format: ['esm'],
    sourcemap: true,
    clean: false,
    target: 'node20',
    outDir: 'dist',
    external: ['react', 'ink', 'ink-text-input', 'esbuild'],
  },
]);
