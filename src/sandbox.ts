import { transformSync } from 'esbuild';
import vm from 'node:vm';
import type { ComponentType } from 'react';

export type SendEvent = (eventType: string, data?: unknown) => void;
export type SubmitEvent = (eventType: string, data?: unknown) => void;

export interface SandboxedProps {
  sendEvent: SendEvent;
  submitEvent: SubmitEvent;
  context: InteractionContext;
}

export interface InteractionContext {
  events: Array<{
    eventType: string;
    data: unknown;
    timestamp: number;
  }>;
}

export type CompileResult =
  | { ok: true; Component: ComponentType<SandboxedProps> }
  | { ok: false; error: string };

/**
 * Compile a shapeshiftui code block (JSX arrow function expression) into a React
 * component. The expression is transpiled with esbuild and evaluated inside a
 * vm context that exposes React, Ink primitives, and standard hooks.
 *
 * Expected source shape:
 *   ({ sendEvent, context, useState, Box, Text, ... }) => {
 *     return <Box>...</Box>
 *   }
 */
export function compileComponent(
  source: string,
  globals: Record<string, unknown>
): CompileResult {
  let transpiled: string;
  try {
    const result = transformSync(source.trim(), {
      loader: 'tsx',
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      target: 'node20',
      format: 'cjs',
    });
    transpiled = result.code.trim();
  } catch (err) {
    return { ok: false, error: `JSX transform failed: ${(err as Error).message}` };
  }

  // esbuild emits a statement; wrap to coerce into an expression position.
  // The source must be a single arrow/function expression, so the trailing
  // semicolon (if any) is harmless inside parens when we strip it.
  const expression = transpiled.replace(/;\s*$/, '');

  try {
    const ctx = vm.createContext({ ...globals });
    const Component = vm.runInContext(`(${expression})`, ctx, {
      timeout: 1000,
      filename: 'shapeshiftui-component.tsx',
    }) as ComponentType<SandboxedProps>;

    if (typeof Component !== 'function') {
      return {
        ok: false,
        error: `Expected a component function, got ${typeof Component}`,
      };
    }

    return { ok: true, Component };
  } catch (err) {
    return { ok: false, error: `Eval failed: ${(err as Error).message}` };
  }
}

/**
 * Pull the first ```shapeshiftui fenced block out of an AI message. Returns the
 * inner source or null if there isn't one.
 */
export function extractCodeBlock(text: string): string | null {
  const match = text.match(/```shapeshiftui\s*\n([\s\S]*?)```/);
  return match ? match[1] : null;
}
