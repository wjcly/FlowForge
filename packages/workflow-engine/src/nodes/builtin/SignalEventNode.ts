// ============================================================
// SignalEventNode — broadcast a signal to waiting executions
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';

export class SignalEventNode extends BaseNode {
  readonly type = 'SignalEvent' as const;
  readonly category = 'event' as const;
  readonly label = 'Signal Event';
  readonly icon = 'radio';

  async execute(
    nodeId: string,
    ctx: ExecutionContext,
    config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    const signalName = config?.name as string | undefined;
    const data = config?.data as Record<string, unknown> | undefined;

    // Emit a signal event — the engine's EventBus picks this up
    // and notifies any executions waiting for this signal.
    ctx.emitEvent('SIGNAL_RECEIVED', {
      nodeId,
      signalName,
      data,
    });

    ctx.setVar(`signal.${nodeId}.name`, signalName);
    if (data) {
      ctx.setVar(`signal.${nodeId}.data`, data);
    }

    return {
      nodeId,
      status: 'success',
      output: {
        event: 'signal',
        signalName,
        data,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
