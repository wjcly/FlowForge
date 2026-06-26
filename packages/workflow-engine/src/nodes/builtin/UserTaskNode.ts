// ============================================================
// UserTaskNode — human-in-the-loop approval / form task
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';

export class UserTaskNode extends BaseNode {
  readonly type = 'UserTask' as const;
  readonly category = 'task' as const;
  readonly label = 'User Task';
  readonly icon = 'user-check';

  async execute(
    nodeId: string,
    _ctx: ExecutionContext,
    config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    // UserTask always returns "waiting" — it requires external completion
    // via the engine's completeTask() API.
    const assignee = config?.assignee as string | undefined;
    const candidates = config?.candidates as string[] | undefined;
    const dueDate = config?.dueDate as string | undefined;

    return {
      nodeId,
      status: 'success', // The node itself succeeded in creating the task
      output: {
        taskType: 'user',
        assignee,
        candidates,
        dueDate,
        formDefinition: config?.formDefinition,
        waitingFor: assignee ?? (candidates?.join(', ') ?? 'unassigned'),
      },
    };
  }

  validateConfig(config?: Record<string, unknown>): boolean {
    if (!config) return false;
    const hasAssignee = typeof (config.assignee as string) === 'string';
    const hasCandidates = Array.isArray(config?.candidates);
    return hasAssignee || hasCandidates;
  }

  async compensate(
    _nodeId: string,
    _ctx: ExecutionContext,
    _config: Record<string, unknown>,
    _originalResult: unknown,
  ): Promise<void> {
    // Compensation: cancel the pending user task
    // Actual cancellation is handled by the engine's persistence layer
  }
}
