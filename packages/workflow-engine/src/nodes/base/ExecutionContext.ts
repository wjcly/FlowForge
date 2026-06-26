// ============================================================
// ExecutionContext — mutable runtime context shared across nodes
// ============================================================

import type {
  ProcessDefinition,
  ExecutionEventType,
  ExecutionEvent,
} from '../../types';
import { generateId } from '../../utils';

let _sequenceCounter = 0;

export class ExecutionContext {
  public readonly executionId: string;
  public readonly processDefinition: ProcessDefinition;
  public readonly variables: Record<string, unknown>;
  public readonly input: Record<string, unknown>;
  public readonly results: Record<string, unknown>;
  public readonly correlationId?: string;
  public readonly tenantId?: string;

  private events: ExecutionEvent[];

  constructor(config: {
    executionId: string;
    processDefinition: ProcessDefinition;
    input: Record<string, unknown>;
    variables?: Record<string, unknown>;
    correlationId?: string;
    tenantId?: string;
  }) {
    this.executionId = config.executionId;
    this.processDefinition = config.processDefinition;
    this.input = config.input;
    this.variables = { ...config.variables };
    this.results = {};
    this.correlationId = config.correlationId;
    this.tenantId = config.tenantId;
    this.events = [];
  }

  /**
   * Get a variable by key (supports dot notation).
   */
  getVar(path: string): unknown {
    const parts = path.split('.');
    let current: unknown = this.variables;

    for (const part of parts) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Set a variable.
   */
  setVar(key: string, value: unknown): void {
    this.variables[key] = value;
    this.emitEvent('VARIABLE_UPDATED', { key, value });
  }

  /**
   * Store result from a node execution.
   */
  setResult(nodeId: string, result: unknown): void {
    this.results[nodeId] = result;
  }

  /**
   * Get result from a specific node.
   */
  getResult(nodeId: string): unknown {
    return this.results[nodeId];
  }

  /**
   * Emit an execution event.
   */
  emitEvent(type: ExecutionEventType, payload?: Record<string, unknown>): void {
    _sequenceCounter++;
    const event: ExecutionEvent = {
      id: generateId(),
      executionId: this.executionId,
      eventType: type,
      payload,
      sequenceNumber: _sequenceCounter,
      createdAt: new Date(),
    };
    this.events.push(event);
  }

  /**
   * Get all events emitted so far.
   */
  getEvents(): ExecutionEvent[] {
    return [...this.events];
  }

  /**
   * Create a shallow copy with updated variables (for fork scenarios).
   */
  fork(variables?: Record<string, unknown>): ExecutionContext {
    return new ExecutionContext({
      executionId: this.executionId,
      processDefinition: this.processDefinition,
      input: this.input,
      variables: { ...this.variables, ...variables },
      correlationId: this.correlationId,
      tenantId: this.tenantId,
    });
  }
}
