import { describe, it, expect } from 'vitest';
import {
  PromptTemplateManager,
  createTemplateManager,
  DEFAULT_TEMPLATE_CONFIG,
  getSystemPrompt,
  getRelevantExamples,
  getAllExamples,
  BASIC_EXAMPLES,
  FORM_EXAMPLES,
} from '../../../src/prompt/templates/index.js';
import {
  getExamplesByCategory,
  LAYOUT_EXAMPLES,
  INTERACTIVE_EXAMPLES,
} from '../../../src/prompt/templates/examples.js';

describe('Prompt Templates', () => {
  describe('PromptTemplateManager', () => {
    it('should create a manager with default config', () => {
      const manager = createTemplateManager();
      const config = manager.getConfig();

      expect(config.includeExamples).toBe(true);
      expect(config.maxExamples).toBe(3);
      expect(config.includeConstraints).toBe(true);
      expect(config.strictMode).toBe(true);
    });

    it('should allow custom configuration', () => {
      const manager = createTemplateManager({
        maxExamples: 5,
        strictMode: false,
      });
      const config = manager.getConfig();

      expect(config.maxExamples).toBe(5);
      expect(config.strictMode).toBe(false);
      expect(config.includeExamples).toBe(true); // Default preserved
    });

    it('should get system prompt without terminal context', () => {
      const manager = createTemplateManager();
      const prompt = manager.getSystemPrompt();

      expect(prompt).toContain('blessed');
      expect(prompt).toContain('CRITICAL RULES');
      expect(prompt).toContain('screen.render()');
    });

    it('should get system prompt with terminal context', () => {
      const manager = createTemplateManager();
      const prompt = manager.getSystemPrompt({ width: 120, height: 40 });

      expect(prompt).toContain('Terminal');
      expect(prompt).toContain('120');
      expect(prompt).toContain('40');
    });

    it('should get relevant examples for request', () => {
      const manager = createTemplateManager();
      const examples = manager.getExamples('create a table with data');

      expect(examples.length).toBeGreaterThan(0);
      expect(examples.length).toBeLessThanOrEqual(3);

      // Should include a table example
      const hasTableExample = examples.some(e =>
        e.request.toLowerCase().includes('table') ||
        e.code.includes('blessed.table')
      );
      expect(hasTableExample).toBe(true);
    });

    it('should limit examples to maxExamples', () => {
      const manager = createTemplateManager({ maxExamples: 2 });
      const examples = manager.getExamples('create a dashboard with table, list, and form');

      expect(examples.length).toBeLessThanOrEqual(2);
    });

    it('should allow adding custom examples', () => {
      const manager = createTemplateManager();
      const customExample = {
        request: 'Create a custom widget',
        code: 'const blessed = require("blessed"); // custom',
      };

      manager.addCustomExamples([customExample]);
      const allExamples = manager.getAllExamples();

      expect(allExamples).toContainEqual(customExample);
    });

    it('should build complete prompt', () => {
      const manager = createTemplateManager();
      const { systemPrompt, userPrompt, examples } = manager.buildCompletePrompt(
        'show a list of items',
        { width: 100, height: 30 }
      );

      expect(systemPrompt).toContain('blessed');
      expect(userPrompt).toContain('list of items');
      expect(userPrompt).toContain('100x30');
      expect(examples.length).toBeGreaterThan(0);
    });

    it('should exclude examples when disabled', () => {
      const manager = createTemplateManager({ includeExamples: false });
      const { examples } = manager.buildCompletePrompt('create a box');

      expect(examples.length).toBe(0);
    });

    it('should get template metadata', () => {
      const manager = createTemplateManager();
      const metadata = manager.getTemplateMetadata();

      expect(metadata.length).toBeGreaterThan(0);
      expect(metadata.some(m => m.category === 'system')).toBe(true);
      expect(metadata.some(m => m.category === 'examples')).toBe(true);
    });

    it('should update configuration', () => {
      const manager = createTemplateManager();
      manager.updateConfig({ maxExamples: 10 });

      expect(manager.getConfig().maxExamples).toBe(10);
    });
  });

  describe('getSystemPrompt', () => {
    it('should include all required sections', () => {
      const prompt = getSystemPrompt();

      // Critical sections
      expect(prompt).toContain('OUTPUT FORMAT');
      expect(prompt).toContain('ALLOWED WIDGETS');
      expect(prompt).toContain('FORBIDDEN');
      expect(prompt).toContain('REQUIRED CODE STRUCTURE');
      expect(prompt).toContain('POSITIONING');
    });

    it('should list all allowed blessed widgets', () => {
      const prompt = getSystemPrompt();

      const widgets = [
        'blessed.screen',
        'blessed.box',
        'blessed.text',
        'blessed.list',
        'blessed.table',
        'blessed.form',
        'blessed.input',
        'blessed.button',
        'blessed.textarea',
        'blessed.checkbox',
        'blessed.radioset',
        'blessed.progressbar',
      ];

      for (const widget of widgets) {
        expect(prompt).toContain(widget);
      }
    });

    it('should list blocked operations', () => {
      const prompt = getSystemPrompt();

      const blocked = ['fs', 'net', 'child_process', 'eval', '__proto__'];

      for (const item of blocked) {
        expect(prompt).toContain(item);
      }
    });
  });

  describe('getRelevantExamples', () => {
    it('should return at least one example', () => {
      const examples = getRelevantExamples('random text');
      expect(examples.length).toBeGreaterThan(0);
    });

    it('should return table example for table requests', () => {
      const examples = getRelevantExamples('show a table with columns');

      const hasTableExample = examples.some(e =>
        e.code.includes('blessed.table')
      );
      expect(hasTableExample).toBe(true);
    });

    it('should return list example for list requests', () => {
      const examples = getRelevantExamples('create a list of items');

      const hasListExample = examples.some(e =>
        e.code.includes('blessed.list')
      );
      expect(hasListExample).toBe(true);
    });

    it('should return form example for form requests', () => {
      const examples = getRelevantExamples('make a form with inputs');

      const hasFormExample = examples.some(e =>
        e.code.includes('blessed.form')
      );
      expect(hasFormExample).toBe(true);
    });

    it('should return login form for login requests', () => {
      const examples = getRelevantExamples('create a login form');

      const hasLoginExample = examples.some(e =>
        e.request.toLowerCase().includes('login') ||
        e.code.includes('censor')
      );
      expect(hasLoginExample).toBe(true);
    });

    it('should return dashboard example for dashboard requests', () => {
      const examples = getRelevantExamples('build a dashboard');

      const hasDashboardExample = examples.some(e =>
        e.request.toLowerCase().includes('dashboard')
      );
      expect(hasDashboardExample).toBe(true);
    });

    it('should return progress example for progress requests', () => {
      const examples = getRelevantExamples('show a progress bar');

      const hasProgressExample = examples.some(e =>
        e.code.includes('progressbar')
      );
      expect(hasProgressExample).toBe(true);
    });

    it('should limit to 3 examples', () => {
      const examples = getRelevantExamples(
        'dashboard with table, list, form, progress bar, checkbox'
      );
      expect(examples.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getAllExamples', () => {
    it('should return all example categories', () => {
      const examples = getAllExamples();

      expect(examples.length).toBeGreaterThan(5);

      // Check for examples from different categories
      const hasBasic = examples.some(e => e.request.includes('welcome'));
      const hasForm = examples.some(e => e.request.includes('form'));
      const hasLayout = examples.some(e =>
        e.request.includes('dashboard') || e.request.includes('split')
      );
      const hasInteractive = examples.some(e =>
        e.request.includes('progress') || e.request.includes('checkbox')
      );

      expect(hasBasic).toBe(true);
      expect(hasForm).toBe(true);
      expect(hasLayout).toBe(true);
      expect(hasInteractive).toBe(true);
    });
  });

  describe('getExamplesByCategory', () => {
    it('should return basic examples', () => {
      const examples = getExamplesByCategory('basic');
      expect(examples).toEqual(BASIC_EXAMPLES);
    });

    it('should return form examples', () => {
      const examples = getExamplesByCategory('form');
      expect(examples).toEqual(FORM_EXAMPLES);
    });

    it('should return layout examples', () => {
      const examples = getExamplesByCategory('layout');
      expect(examples).toEqual(LAYOUT_EXAMPLES);
    });

    it('should return interactive examples', () => {
      const examples = getExamplesByCategory('interactive');
      expect(examples).toEqual(INTERACTIVE_EXAMPLES);
    });
  });

  describe('DEFAULT_TEMPLATE_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_TEMPLATE_CONFIG.includeExamples).toBe(true);
      expect(DEFAULT_TEMPLATE_CONFIG.maxExamples).toBe(3);
      expect(DEFAULT_TEMPLATE_CONFIG.includeConstraints).toBe(true);
      expect(DEFAULT_TEMPLATE_CONFIG.strictMode).toBe(true);
    });
  });
});
