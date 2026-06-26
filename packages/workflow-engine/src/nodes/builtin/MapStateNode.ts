// ============================================================
// MapStateNode — iterate over an array, executing a sub-flow per item
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';
import { evaluateJsonPath } from '../../utils';

export class MapStateNode extends BaseNode {
  readonly type = 'MapState' as const;
  readonly category = 'control' as const;
  readonly label = 'Map State';
  readonly icon = 'list';

  async execute(
    nodeId: string,
    ctx: ExecutionContext,
    config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    // MapState iterates over an input array and collects results.
    // The "items" config specifies a JSONPath to the array.
    // The "resultPath" specifies where to store collected results.

    const itemsPath = (config?.items as string) ?? '$.input';
    const resultPath = (config?.resultPath as string) ?? `map.${nodeId}`;
    const maxConcurrency = (config?.maxConcurrency as number) ?? 5;

    const inputArray = evaluateJsonPath(ctx.variables, itemsPath);

    if (!Array.isArray(inputArray)) {
      return {
        nodeId,
        status: 'failed',
        error: `MapState: "${itemsPath}" is not an array`,
      };
    }

    // For each item, store its index and value, then continue to next node.
    // The actual iteration logic is coordinated by the DAGExecutor.
    // Here we prepare the iteration metadata.

    const iterationData = inputArray.map((item: unknown, index: number) => ({
      index,
      item,
      total: inputArray.length,
    }));

    ctx.setVar(`${resultPath}.items`, inputArray);
    ctx.setVar(`${resultPath}.count`, inputArray.length);
    ctx.setVar(`${resultPath}.maxConcurrency`, maxConcurrency);
    ctx.setVar(`${resultPath}.iterationData`, iterationData);

    return {
      nodeId,
      status: 'success',
      output: {
        mapped: true,
        count: inputArray.length,
        resultPath,
        items: iterationData,
      },
    };
  }
}
