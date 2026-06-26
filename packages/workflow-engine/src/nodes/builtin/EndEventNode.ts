// ============================================================
// EndEventNode — workflow termination point
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';

export class EndEventNode extends BaseNode {
  readonly type = 'EndEvent' as const;
  readonly category = 'event' as const;
  readonly label = 'End Event';
  readonly icon = 'circle-stop';

  async execute(
    nodeId: string,
    ctx: ExecutionContext,
    _config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    ctx.setVar('$completedAt', new Date().toISOString());

    return {
      nodeId,
      status: 'success',
      output: {
        event: 'end',
        variables: { ...ctx.variables },
        results: { ...ctx.results },
        timestamp: new Date().toISOString(),
      },
    };
  }
}
