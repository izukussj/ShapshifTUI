/**
 * Prompt Template Manager
 *
 * Implements US4: Prompt Engineering System
 * - Loads and combines prompt templates
 * - Provides library-specific constraints and output format requirements
 * - Ensures consistent, high-quality AI outputs
 */

import { SYSTEM_PROMPT, getSystemPrompt } from './system.js';
import { getAllExamples, getRelevantExamples, BASIC_EXAMPLES, FORM_EXAMPLES } from './examples.js';
import {
  RETRY_PROMPT_TEMPLATE,
  NON_CODE_RETRY_TEMPLATE,
  buildRetryPromptSection,
  getErrorSpecificInstructions,
} from './retry.js';
import type { CodeExample } from '../../ai/types.js';

/**
 * Template categories for organization
 */
export type TemplateCategory = 'system' | 'examples' | 'retry' | 'constraints';

/**
 * Template metadata
 */
export interface TemplateMetadata {
  name: string;
  category: TemplateCategory;
  description: string;
  version: string;
}

/**
 * Template configuration
 */
export interface TemplateConfig {
  includeExamples: boolean;
  maxExamples: number;
  includeConstraints: boolean;
  strictMode: boolean;
}

/**
 * Default template configuration
 */
export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  includeExamples: true,
  maxExamples: 3,
  includeConstraints: true,
  strictMode: true,
};

/**
 * Prompt Template Manager class
 */
export class PromptTemplateManager {
  private config: TemplateConfig;
  private customExamples: CodeExample[] = [];

  constructor(config: Partial<TemplateConfig> = {}) {
    this.config = { ...DEFAULT_TEMPLATE_CONFIG, ...config };
  }

  /**
   * Get the system prompt with optional terminal context
   */
  getSystemPrompt(terminalContext?: { width?: number; height?: number }): string {
    return getSystemPrompt(terminalContext);
  }

  /**
   * Get relevant examples for a user request
   */
  getExamples(userRequest: string): CodeExample[] {
    const relevantExamples = getRelevantExamples(userRequest);
    const allExamples = [...relevantExamples, ...this.customExamples];

    // Deduplicate and limit
    const seen = new Set<string>();
    const uniqueExamples: CodeExample[] = [];

    for (const example of allExamples) {
      if (!seen.has(example.request) && uniqueExamples.length < this.config.maxExamples) {
        seen.add(example.request);
        uniqueExamples.push(example);
      }
    }

    return uniqueExamples;
  }

  /**
   * Add custom examples
   */
  addCustomExamples(examples: CodeExample[]): void {
    this.customExamples.push(...examples);
  }

  /**
   * Get all available examples
   */
  getAllExamples(): CodeExample[] {
    return [...getAllExamples(), ...this.customExamples];
  }

  /**
   * Build a complete prompt for a user request
   */
  buildCompletePrompt(
    userRequest: string,
    terminalContext?: { width?: number; height?: number }
  ): {
    systemPrompt: string;
    userPrompt: string;
    examples: CodeExample[];
  } {
    const systemPrompt = this.getSystemPrompt(terminalContext);
    const examples = this.config.includeExamples ? this.getExamples(userRequest) : [];

    let userPrompt = `Generate blessed TUI code for: ${userRequest}`;

    if (terminalContext) {
      userPrompt += `\n\nTerminal size: ${terminalContext.width || 'auto'}x${terminalContext.height || 'auto'}`;
    }

    return {
      systemPrompt,
      userPrompt,
      examples,
    };
  }

  /**
   * Get template metadata
   */
  getTemplateMetadata(): TemplateMetadata[] {
    return [
      {
        name: 'system',
        category: 'system',
        description: 'Core system prompt with blessed library constraints',
        version: '1.0.0',
      },
      {
        name: 'basic-examples',
        category: 'examples',
        description: 'Basic examples for common TUI patterns',
        version: '1.0.0',
      },
      {
        name: 'form-examples',
        category: 'examples',
        description: 'Examples for form-based interfaces',
        version: '1.0.0',
      },
      {
        name: 'retry',
        category: 'retry',
        description: 'Templates for retry prompts with error context',
        version: '1.0.0',
      },
    ];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TemplateConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): TemplateConfig {
    return { ...this.config };
  }
}

/**
 * Create a template manager instance
 */
export function createTemplateManager(config?: Partial<TemplateConfig>): PromptTemplateManager {
  return new PromptTemplateManager(config);
}

// Re-export templates and utilities
export {
  SYSTEM_PROMPT,
  getSystemPrompt,
  getAllExamples,
  getRelevantExamples,
  BASIC_EXAMPLES,
  FORM_EXAMPLES,
  RETRY_PROMPT_TEMPLATE,
  NON_CODE_RETRY_TEMPLATE,
  buildRetryPromptSection,
  getErrorSpecificInstructions,
};
