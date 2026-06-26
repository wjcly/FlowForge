// ============================================================
// ScriptTaskNode — execute JavaScript in a sandboxed environment
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';

export class ScriptTaskNode extends BaseNode {
  readonly type = 'ScriptTask' as const;
  readonly category = 'task' as const;
  readonly label = 'Script Task';
  readonly icon = 'code';

  async execute(
    nodeId: string,
    ctx: ExecutionContext,
    config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    const script = config?.script as string | undefined;
    const engine = (config?.engine as string) ?? 'javascript';

    if (!script) {
      return {
        nodeId,
        status: 'failed',
        error: 'ScriptTask requires a "script" config',
      };
    }

    if (engine !== 'javascript' && engine !== 'typescript') {
      return {
        nodeId,
        status: 'failed',
        error: `Unsupported script engine: "${engine}". Use "javascript" or "typescript".`,
      };
    }

    try {
      // Create a sandboxed execution context
      const sandbox = createScriptSandbox(ctx, config);

      // Execute the script — the function receives ctx and config, returns result
      const fn = new Function(
        'ctx',
        'config',
        `
        "use strict";
        return (async () => {
          ${script}
        })();
        `,
      );

      const result = await fn(sandbox, config ?? {});

      return {
        nodeId,
        status: 'success',
        output: { result },
      };
    } catch (err) {
      return {
        nodeId,
        status: 'failed',
        error: `Script execution failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  validateConfig(config?: Record<string, unknown>): boolean {
    if (!config) return false;
    return typeof (config.script as string) === 'string' && (config.script as string).length > 0;
  }
}

/**
 * Create a safe sandbox object exposing only the needed context.
 */
function createScriptSandbox(
  ctx: ExecutionContext,
  _config?: Record<string, unknown>,
) {
  return {
    // Read-only access to execution ID and process info
    get executionId() { return ctx.executionId; },
    get correlationId() { return ctx.correlationId; },

    // Variable access
    getVar(path: string) { return ctx.getVar(path); },
    setVar(key: string, value: unknown) { ctx.setVar(key, value); },

    // Input data
    get input() { return { ...ctx.input }; },

    // Results from previous nodes
    getResult(nodeId: string) { return ctx.getResult(nodeId); },
    get results() { return { ...ctx.results }; },

    // All variables (shallow copy for safety)
    get variables() { return { ...ctx.variables }; },
  };
}
