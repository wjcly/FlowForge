// ============================================================
// WaitStateNode — pause execution for a configurable duration
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';
import { sleep } from '../../utils';

export class WaitStateNode extends BaseNode {
  readonly type = 'WaitState' as const;
  readonly category = 'control' as const;
  readonly label = 'Wait State';
  readonly icon = 'pause';

  async execute(
    nodeId: string,
    ctx: ExecutionContext,
    config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    // Wait modes: seconds, timestamp, or until a variable condition is met
    const mode = config?.mode as string | undefined;

    if (mode === 'seconds') {
      const seconds = (config?.time as number) ?? 0;
      if (seconds > 0) await sleep(seconds * 1000);
    } else if (mode === 'timestamp') {
      const target = new Date(config?.time as string).getTime();
      const delay = Math.max(0, target - Date.now());
      if (delay > 0) await sleep(delay);
    }
    // "variable" mode: handled externally by the engine's scheduler

    ctx.setVar(`wait.${nodeId}.resumedAt`, new Date().toISOString());

    return {
      nodeId,
      status: 'success',
      output: {
        waited: true,
        mode: mode ?? 'seconds',
        resumedAt: new Date().toISOString(),
      },
    };
  }
}
