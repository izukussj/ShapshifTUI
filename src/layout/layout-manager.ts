import jsonpatch from 'fast-json-patch';
import type { LayoutDefinition, JsonPatchOperation } from '../types/index.js';

const { applyPatch } = jsonpatch;
type Operation = jsonpatch.Operation;
import { validateLayout, type ValidationResult } from '../validation/index.js';
import { getEventBus } from '../events/index.js';
import { getThemeManager } from '../theme/index.js';

/**
 * Layout manager - handles layout lifecycle and updates
 */
export class LayoutManager {
  private currentLayout: LayoutDefinition | null = null;
  private queuedLayouts: LayoutDefinition[] = [];
  private isUserInteracting = false;
  private eventBus = getEventBus();

  constructor() {
    // Listen for user interaction state changes
    this.eventBus.on('user:interacting', (isInteracting) => {
      this.isUserInteracting = isInteracting;
    });

    // When user submits, apply next queued layout
    this.eventBus.on('user:submit', () => {
      this.applyNextQueuedLayout();
    });
  }

  /**
   * Get the current layout
   */
  getCurrentLayout(): LayoutDefinition | null {
    return this.currentLayout;
  }

  /**
   * Get current layout ID
   */
  getCurrentLayoutId(): string | null {
    return this.currentLayout?.id ?? null;
  }

  /**
   * Get queued layouts count
   */
  getQueuedCount(): number {
    return this.queuedLayouts.length;
  }

  /**
   * Handle incoming layout from backend
   */
  handleLayout(layout: LayoutDefinition): ValidationResult {
    process.stderr.write(`[LM] handleLayout: ${layout.id}\n`);

    // Validate the layout
    const validation = validateLayout(layout);
    if (!validation.valid) {
      process.stderr.write(`[LM] validation failed: ${JSON.stringify(validation.errors)}\n`);
      this.eventBus.emit('layout:error', new Error(
        `Invalid layout: ${validation.errors.map(e => e.message).join(', ')}`
      ));
      return validation;
    }

    process.stderr.write(`[LM] valid, isUserInteracting: ${this.isUserInteracting}\n`);

    // If user is interacting, queue the layout
    if (this.isUserInteracting) {
      process.stderr.write(`[LM] queueing layout\n`);
      this.queueLayout(layout);
      return validation;
    }

    // Apply immediately
    process.stderr.write(`[LM] applying immediately\n`);
    this.applyLayout(layout);
    return validation;
  }

  /**
   * Handle incremental layout patch
   */
  handlePatch(layoutId: string, patches: JsonPatchOperation[]): ValidationResult {
    if (!this.currentLayout) {
      return {
        valid: false,
        errors: [{ path: '/', message: 'No current layout to patch', keyword: 'required' }],
      };
    }

    if (this.currentLayout.id !== layoutId) {
      return {
        valid: false,
        errors: [{ path: '/id', message: `Layout ID mismatch: ${layoutId}`, keyword: 'const' }],
      };
    }

    try {
      // Apply patches to current layout
      const patchedLayout = applyPatch(
        structuredClone(this.currentLayout),
        patches as Operation[],
        true, // validate
        false // don't mutate
      ).newDocument as LayoutDefinition;

      // Validate the patched layout
      const validation = validateLayout(patchedLayout);
      if (!validation.valid) {
        this.eventBus.emit('layout:error', new Error(
          `Invalid patched layout: ${validation.errors.map(e => e.message).join(', ')}`
        ));
        return validation;
      }

      // If user is interacting, queue the patched layout
      if (this.isUserInteracting) {
        this.queueLayout(patchedLayout);
        return validation;
      }

      // Apply the patched layout
      this.applyLayout(patchedLayout);
      return validation;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        valid: false,
        errors: [{ path: '/', message: `Patch failed: ${message}`, keyword: 'patch' }],
      };
    }
  }

  /**
   * Queue a layout for later application
   */
  private queueLayout(layout: LayoutDefinition): void {
    // Replace any existing queued layout (only keep the latest)
    this.queuedLayouts = [layout];
    this.eventBus.emit('layout:queued', layout);
  }

  /**
   * Apply the next queued layout
   */
  private applyNextQueuedLayout(): void {
    const nextLayout = this.queuedLayouts.shift();
    if (nextLayout) {
      this.applyLayout(nextLayout);
    }
  }

  /**
   * Apply a layout
   */
  private applyLayout(layout: LayoutDefinition): void {
    process.stderr.write(`[LM] applyLayout: ${layout.id}\n`);
    this.currentLayout = layout;

    // Update theme manager with layout overrides
    const themeManager = getThemeManager();
    themeManager.setOverrides(layout.theme);

    process.stderr.write(`[LM] emitting events\n`);
    this.eventBus.emit('layout:received', layout);
    this.eventBus.emit('layout:applied', layout.id);
    process.stderr.write(`[LM] events emitted\n`);
  }

  /**
   * Clear current layout and queue
   */
  clear(): void {
    this.currentLayout = null;
    this.queuedLayouts = [];
    getThemeManager().clearOverrides();
  }
}

// Singleton instance
let layoutManagerInstance: LayoutManager | null = null;

/**
 * Get the global layout manager instance
 */
export function getLayoutManager(): LayoutManager {
  if (!layoutManagerInstance) {
    layoutManagerInstance = new LayoutManager();
  }
  return layoutManagerInstance;
}
