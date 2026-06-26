// ============================================================
// MessageEventNode — wait for / emit a named message
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';

export class MessageEventNode extends BaseNode {
  readonly type = 'MessageEvent' as const;
  readonly category = 'event' as const;
  readonly label = 'Message Event';
  readonly icon = 'message-square';

  async execute(
    nodeId: string,
    ctx: ExecutionContext,
    config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    const messageName = config?.name as string | undefined;

    // Message events are typically "catch" events — the engine pauses
    // execution until a matching message is received via sendSignal().
    // Here we record that this node expects a message.

    ctx.setVar(`message.${nodeId}.expected`, messageName);

    return {
      nodeId,
      status: 'success',
      output: {
        event: 'message',
        messageName,
        correlationKey: config?.correlationKey,
        waiting: true,
      },
    };
  }
}
