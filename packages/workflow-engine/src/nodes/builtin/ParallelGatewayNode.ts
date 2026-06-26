// ============================================================
// ParallelGatewayNode — fork/join concurrent execution
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';

export class ParallelGatewayNode extends BaseNode {
  readonly type = 'ParallelGateway' as const;
  readonly category = 'gateway' as const;
  readonly label = 'Parallel Gateway';
  readonly icon = 'split';

  async execute(
    nodeId: string,
    _ctx: ExecutionContext,
    config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    // The actual forking is handled by DAGExecutor.
    // This node just records the fork point.
    return {
      nodeId,
      status: 'success',
      output: {
        gatewayType: 'parallel',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
