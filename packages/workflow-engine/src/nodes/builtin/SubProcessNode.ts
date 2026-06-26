// ============================================================
// SubProcessNode — execute a nested sub-process within the workflow
// ============================================================

import type { NodeExecutionResult, ExecutionContext } from '../../types';
import { BaseNode } from '../base/BaseNode';

export class SubProcessNode extends BaseNode {
  readonly type = 'SubProcess' as const;
  readonly category = 'control' as const;
  readonly label = 'Sub-Process';
  readonly icon = 'folder-tree';

  async execute(
    nodeId: string,
    ctx: ExecutionContext,
    config?: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    // SubProcess delegates to the engine to execute nested states.
    // The actual execution is handled by WorkflowEngine.executeSubProcess().
    // This node just records the sub-process entry point.

    const subFlowId = config?.subFlowId as string | undefined;
    const inputMapping = config?.input as Record<string, string> | undefined;

    return {
      nodeId,
      status: 'success',
      output: {
        subprocess: true,
        subFlowId,
        inputMapping,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
