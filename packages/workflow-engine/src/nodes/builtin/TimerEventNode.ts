// ============================================================
// TimerEventNode — delay / scheduled trigger within workflow
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';
import { sleep } from '../../utils';

export class TimerEventNode extends BaseNode {
  readonly type = 'TimerEvent' as const;
  readonly category = 'event' as const;
  readonly label = 'Timer Event';
  readonly icon = 'clock';

  async execute(
    nodeId: string,
    ctx: ExecutionContext,
    config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    // Support multiple timer modes:
    // 1. "seconds" — wait N seconds
    // 2. "timestamp" — wait until a specific time
    // 3. "cron" — returns waiting (handled by scheduler externally)

    const mode = config?.mode as string | undefined;

    if (mode === 'cron') {
      // Cron timers are managed by the Scheduler, not executed inline
      return {
        nodeId,
        status: 'success',
        output: {
          event: 'timer',
          mode: 'cron',
          expression: config?.expression,
          waiting: true,
        },
      };
    }

    let delayMs = 0;

    if (mode === 'timestamp' && config?.timestamp) {
      const target = new Date(config.timestamp as string).getTime();
      delayMs = Math.max(0, target - Date.now());
    } else {
      // Default: seconds-based
      const seconds = (config?.seconds as number) ?? (config?.time as number) ?? 0;
      delayMs = seconds * 1000;
    }

    if (delayMs > 0) {
      await sleep(delayMs);
    }

    ctx.setVar(`timer.${nodeId}.firedAt`, new Date().toISOString());

    return {
      nodeId,
      status: 'success',
      output: {
        event: 'timer',
        mode: mode ?? 'seconds',
        delayMs,
        firedAt: new Date().toISOString(),
      },
    };
  }
}
