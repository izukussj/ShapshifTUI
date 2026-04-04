/**
 * Action types that can be triggered by events
 */
export type ActionType = 'emit' | 'navigate' | 'update' | 'execute';

/**
 * Action definition - what happens in response to an event
 */
export interface Action {
  /** Action type */
  type: ActionType;

  /** Target widget or route (for navigate/update) */
  target?: string;

  /** Data to send or update */
  data?: Record<string, unknown>;

  /** Condition for executing action (simple expression) */
  condition?: string;
}

/**
 * Emit action - sends event to AI backend
 */
export interface EmitAction extends Action {
  type: 'emit';
  /** Event name to emit */
  target?: string;
  /** Data payload to send */
  data?: Record<string, unknown>;
}

/**
 * Navigate action - changes layout or view
 */
export interface NavigateAction extends Action {
  type: 'navigate';
  /** Target route or layout */
  target: string;
  /** Navigation params */
  data?: Record<string, unknown>;
}

/**
 * Update action - updates widget state locally
 */
export interface UpdateAction extends Action {
  type: 'update';
  /** Target widget ID */
  target: string;
  /** Properties to update */
  data: Record<string, unknown>;
}

/**
 * Execute action - runs a predefined command
 */
export interface ExecuteAction extends Action {
  type: 'execute';
  /** Command to execute */
  target: string;
  /** Command arguments */
  data?: Record<string, unknown>;
}
