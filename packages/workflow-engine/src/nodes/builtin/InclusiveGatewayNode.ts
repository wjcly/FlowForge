// ============================================================
// InclusiveGatewayNode — conditionally select a subset of branches
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';

export class InclusiveGatewayNode extends BaseNode {
  readonly type = 'InclusiveGateway' as const;
  readonly category = 'gateway' as const;
  readonly label = 'Inclusive Gateway';
  readonly icon = 'git-merge';

  async execute(
    nodeId: string,
    _ctx: ExecutionContext,
    _config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    return {
      nodeId,
      status: 'success',
      output: {
        gatewayType: 'inclusive',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
