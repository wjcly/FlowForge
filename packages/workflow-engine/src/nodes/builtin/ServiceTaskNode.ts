// ============================================================
// ServiceTaskNode — generic service invocation (webhook / callback)
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';

export class ServiceTaskNode extends BaseNode {
  readonly type = 'ServiceTask' as const;
  readonly category = 'task' as const;
  readonly label = 'Service Task';
  readonly icon = 'settings';

  async execute(
    nodeId: string,
    ctx: ExecutionContext,
    config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    // ServiceTask is a generic node that can be bound to any service handler.
    // By default, it acts like an HttpTask if URL is provided, otherwise
    // it passes the data through for custom handlers to intercept.

    const url = config?.url as string | undefined;

    if (url) {
      // Delegate to HTTP execution
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            executionId: ctx.executionId,
            variables: ctx.variables,
            input: config?.input ?? {},
          }),
        });

        const body = await response.json().catch(() => response.text());

        ctx.setVar(`service.${nodeId}.statusCode`, response.status);
        ctx.setVar(`service.${nodeId}.body`, body);

        return {
          nodeId,
          status: response.ok ? 'success' : 'failed',
          output: { statusCode: response.status, body },
          error: response.ok ? undefined : `HTTP ${response.status}`,
        };
      } catch (err) {
        return {
          nodeId,
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    // No URL — pass-through for custom handler interception
    return {
      nodeId,
      status: 'success',
      output: {
        executed: true,
        config: config ?? {},
        timestamp: new Date().toISOString(),
      },
    };
  }
}
