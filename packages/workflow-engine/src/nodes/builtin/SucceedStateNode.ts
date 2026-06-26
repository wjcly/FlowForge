// ============================================================
// SucceedStateNode — explicitly succeed the workflow execution
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';

export class SucceedStateNode extends BaseNode {
  readonly type = 'SucceedState' as const;
  readonly category = 'control' as const;
  readonly label = 'Succeed State';
  readonly icon = 'check-circle';

  async execute(
    nodeId: string,
    ctx: ExecutionContext,
    config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    return {
      nodeId,
      status: 'success',
      output: {
        succeeded: true,
        output: config?.output ?? {},
        variables: { ...ctx.variables },
        timestamp: new Date().toISOString(),
      },
    };
  }
}
