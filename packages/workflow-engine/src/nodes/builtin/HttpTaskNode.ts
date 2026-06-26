// ============================================================
// HttpTaskNode — make HTTP requests from workflow nodes
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';

export class HttpTaskNode extends BaseNode {
  readonly type = 'HttpTask' as const;
  readonly category = 'task' as const;
  readonly label = 'HTTP Request';
  readonly icon = 'globe';

  async execute(
    nodeId: string,
    ctx: ExecutionContext,
    config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    const url = config?.url as string;
    const method = (config?.method as string) ?? 'POST';
    const headers = (config?.headers as Record<string, string>) ?? {};
    const body = config?.body as Record<string, unknown> | undefined;
    const timeoutMs = (config?.timeout as number) ?? 30000;

    if (!url) {
      return {
        nodeId,
        status: 'failed',
        error: 'HttpTask requires a "url" config',
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let responseBody: unknown;
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = responseText;
      }

      // Store response in context variables
      ctx.setVar(`http.${nodeId}.statusCode`, response.status);
      ctx.setVar(`http.${nodeId}.body`, responseBody);

      return {
        nodeId,
        status: 'success',
        output: {
          statusCode: response.status,
          ok: response.ok,
          body: responseBody,
          headers: Object.fromEntries(response.headers.entries()),
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        nodeId,
        status: 'failed',
        error: `HTTP request failed: ${message}`,
      };
    }
  }

  validateConfig(config?: Record<string, unknown>): boolean {
    if (!config) return false;
    return typeof (config.url as string) === 'string' && (config.url as string).length > 0;
  }
}
