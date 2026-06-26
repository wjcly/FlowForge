// ============================================================
// CallActivityNode — call an external process definition by key
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';

export class CallActivityNode extends BaseNode {
  readonly type = 'CallActivity' as const;
  readonly category = 'control' as const;
  readonly label = 'Call Activity';
  readonly icon = 'external-link';

  async execute(
    nodeId: string,
    ctx: ExecutionContext,
    config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    // CallActivity invokes another ProcessDefinition by its key.
    // The engine handles the actual invocation via startExecution().

    const processKey = config?.processKey as string | undefined;
    const inputMapping = config?.input as Record<string, unknown> | undefined;

    if (!processKey) {
      return {
        nodeId,
        status: 'failed',
        error: 'CallActivity requires a "processKey" config',
      };
    }

    ctx.setVar(`call.${nodeId}.processKey`, processKey);
    if (inputMapping) {
      ctx.setVar(`call.${nodeId}.input`, inputMapping);
    }

    return {
      nodeId,
      status: 'success',
      output: {
        callActivity: true,
        processKey,
        input: inputMapping,
        timestamp: new Date().toISOString(),
      },
    };
  }

  validateConfig(config?: Record<string, unknown>): boolean {
    if (!config) return false;
    return typeof (config.processKey as string) === 'string';
  }
}
