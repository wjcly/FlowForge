// ============================================================
// FailStateNode — explicitly fail the workflow execution
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';

export class FailStateNode extends BaseNode {
  readonly type = 'FailState' as const;
  readonly category = 'control' as const;
  readonly label = 'Fail State';
  readonly icon = 'x-circle';

  async execute(
    nodeId: string,
    _ctx: ExecutionContext,
    config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    const errorCode = (config?.error as string) ?? 'WorkflowFailed';
    const cause = (config?.cause as string) ?? 'Explicit failure via FailState';

    const errorMessage = `[${errorCode}] ${cause}`;

    return {
      nodeId,
      status: 'failed',
      error: errorMessage,
      output: {
        failed: true,
        errorCode,
        cause,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
