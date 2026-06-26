// ============================================================
// BaseNode — abstract base class for all workflow nodes
// ============================================================

import type {
  NodeType,
  NodeCategory,
  NodeExecutionResult,
  ExecutionContext,
} from '../../types';

/**
 * Abstract base class that all node types extend.
 */
export abstract class BaseNode {
  abstract readonly type: NodeType;
  abstract readonly category: NodeCategory;

  /**
   * Human-readable label for the node.
   */
  abstract readonly label: string;

  /**
   * Icon identifier (for UI rendering).
   */
  icon?: string;

  /**
   * Execute this node with the given context and config.
   * Subclasses MUST implement this.
   */
  abstract execute(
    nodeId: string,
    ctx: ExecutionContext,
    config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult>;

  /**
   * Compensate (undo) a previously executed node. Used in Saga pattern.
   * Return null if compensation is not supported.
   */
  async compensate(
    _nodeId: string,
    _ctx: ExecutionContext,
    _config: Record<string, unknown>,
    _originalResult: unknown,
  ): Promise<void | null> {
    return null;
  }

  /**
   * Validate node configuration before execution.
   * Override to add custom validation.
   */
  validateConfig(_config?: Record<string, unknown>): boolean {
    return true;
  }
}
