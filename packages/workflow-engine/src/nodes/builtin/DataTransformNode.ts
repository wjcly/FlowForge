// ============================================================
// DataTransformNode — transform / map data between formats
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';
import { evaluateJsonPath } from '../../utils';

export class DataTransformNode extends BaseNode {
  readonly type = 'DataTransform' as const;
  readonly category = 'task' as const;
  readonly label = 'Data Transform';
  readonly icon = 'arrow-right-left';

  async execute(
    nodeId: string,
    ctx: ExecutionContext,
    config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    const mappings = config?.mappings as Record<string, string> | undefined;

    if (!mappings || Object.keys(mappings).length === 0) {
      // No mappings — pass through all variables
      return {
        nodeId,
        status: 'success',
        output: { ...ctx.variables },
      };
    }

    const transformed: Record<string, unknown> = {};

    for (const [outputKey, sourcePath] of Object.entries(mappings)) {
      const value = evaluateJsonPath(ctx.variables, sourcePath);
      transformed[outputKey] = value;
      // Also set in context variables
      ctx.setVar(outputKey, value);
    }

    return {
      nodeId,
      status: 'success',
      output: transformed,
    };
  }

  validateConfig(config?: Record<string, unknown>): boolean {
    if (!config) return true; // pass-through mode is valid
    const mappings = config.mappings as Record<string, string> | undefined;
    if (!mappings) return true;
    return Object.values(mappings).every((v) => typeof v === 'string');
  }
}
