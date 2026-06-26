// ============================================================
// StartEventNode — workflow entry point
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';

export class StartEventNode extends BaseNode {
  readonly type = 'StartEvent' as const;
  readonly category = 'event' as const;
  readonly label = 'Start Event';
  readonly icon = 'play';

  async execute(
    nodeId: string,
    ctx: ExecutionContext,
    _config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    // Capture the initial state of variables at start time
    ctx.setVar('$startedAt', new Date().toISOString());
    ctx.setVar('$executionId', ctx.executionId);

    return {
      nodeId,
      status: 'success',
      output: {
        event: 'start',
        input: { ...ctx.input },
        timestamp: new Date().toISOString(),
      },
    };
  }
}
