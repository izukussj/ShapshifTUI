import { Ajv, ValidateFunction, ErrorObject } from 'ajv';
import type { LayoutDefinition, Event } from '../types/index.js';
import { SUPPORTED_VERSION } from '../types/index.js';
import layoutSchema from '../schemas/layout-definition.schema.json' with { type: 'json' };
import eventSchema from '../schemas/event.schema.json' with { type: 'json' };

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Structured validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  params?: Record<string, unknown>;
}

/**
 * Convert AJV errors to structured ValidationErrors
 */
function formatErrors(errors: ErrorObject[] | null | undefined): ValidationError[] {
  if (!errors) return [];

  return errors.map((err) => ({
    path: err.instancePath || '/',
    message: err.message || 'Unknown validation error',
    keyword: err.keyword,
    params: err.params as Record<string, unknown>,
  }));
}

/**
 * Schema validator using AJV
 */
export class SchemaValidator {
  private ajv: Ajv;
  private layoutValidator: ValidateFunction<LayoutDefinition>;
  private eventValidator: ValidateFunction<Event>;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
      validateSchema: false, // Don't validate schemas against meta-schema
    });

    this.layoutValidator = this.ajv.compile<LayoutDefinition>(layoutSchema);
    this.eventValidator = this.ajv.compile<Event>(eventSchema);
  }

  /**
   * Validate a layout definition
   */
  validateLayout(data: unknown): ValidationResult {
    // First check version (strict matching per spec)
    if (typeof data === 'object' && data !== null && 'version' in data) {
      const version = (data as { version: unknown }).version;
      if (version !== SUPPORTED_VERSION) {
        return {
          valid: false,
          errors: [
            {
              path: '/version',
              message: `Unsupported schema version: ${version}. Expected: ${SUPPORTED_VERSION}`,
              keyword: 'const',
              params: { allowedValue: SUPPORTED_VERSION },
            },
          ],
        };
      }
    }

    const valid = this.layoutValidator(data);

    return {
      valid,
      errors: formatErrors(this.layoutValidator.errors),
    };
  }

  /**
   * Validate an event
   */
  validateEvent(data: unknown): ValidationResult {
    const valid = this.eventValidator(data);

    return {
      valid,
      errors: formatErrors(this.eventValidator.errors),
    };
  }

  /**
   * Validate widget IDs are unique within a layout
   */
  validateWidgetIds(layout: LayoutDefinition): ValidationResult {
    const ids = new Set<string>();
    const duplicates: string[] = [];

    const collectIds = (widget: { id: string; children?: Array<{ id: string; children?: unknown[] }> }) => {
      if (ids.has(widget.id)) {
        duplicates.push(widget.id);
      } else {
        ids.add(widget.id);
      }

      if (widget.children) {
        for (const child of widget.children) {
          collectIds(child as { id: string; children?: Array<{ id: string; children?: unknown[] }> });
        }
      }
    };

    collectIds(layout.root);

    if (duplicates.length > 0) {
      return {
        valid: false,
        errors: duplicates.map((id) => ({
          path: `/root`,
          message: `Duplicate widget ID: ${id}`,
          keyword: 'uniqueWidgetIds',
          params: { duplicateId: id },
        })),
      };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Full validation of a layout (schema + business rules)
   */
  validateLayoutFull(data: unknown): ValidationResult {
    const schemaResult = this.validateLayout(data);
    if (!schemaResult.valid) {
      return schemaResult;
    }

    const idResult = this.validateWidgetIds(data as LayoutDefinition);
    if (!idResult.valid) {
      return idResult;
    }

    return { valid: true, errors: [] };
  }
}

// Singleton instance
let validatorInstance: SchemaValidator | null = null;

/**
 * Get the singleton validator instance
 */
export function getValidator(): SchemaValidator {
  if (!validatorInstance) {
    validatorInstance = new SchemaValidator();
  }
  return validatorInstance;
}

/**
 * Validate a layout definition (convenience function)
 */
export function validateLayout(data: unknown): ValidationResult {
  return getValidator().validateLayoutFull(data);
}

/**
 * Validate an event (convenience function)
 */
export function validateEvent(data: unknown): ValidationResult {
  return getValidator().validateEvent(data);
}
