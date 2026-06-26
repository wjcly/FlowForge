// ============================================================
// ExclusiveGatewayNode — XOR branching (first matching condition)
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';
import { evaluateCondition } from '../../engine/DAGExecutor';

export class ExclusiveGatewayNode extends BaseNode {
  readonly type = 'ExclusiveGateway' as const;
  readonly category = 'gateway' as const;
  readonly label = 'Exclusive Gateway';
  readonly icon = 'git-fork';

  async execute(
    nodeId: string,
    ctx: ExecutionContext,
    config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    // The actual branching logic is handled by the DAGExecutor.resolveNextNodes().
    // This node just evaluates and records which branch was taken.
    const defaultBranch = config?.default as string | undefined;

    return {
      nodeId,
      status: 'success',
      output: {
        gatewayType: 'exclusive',
        variables: { ...ctx.variables },
        defaultBranch,
      },
    };
  }
}
