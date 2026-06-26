// ============================================================
// WorkflowEngine — main orchestrator class
// ============================================================

import type {
  ProcessDefinition,
  DeployResult,
  StartOptions,
  WorkflowExecution,
  NodeExecutionResult,
  ExecutionStatus,
  ExecutionGraph,
  SignalEvent,
  UserTaskInstance,
  TimerEntry,
  EngineConfig,
} from '../types';
import { generateId } from '../utils';
import { EventBus } from './EventBus';
import { StateMachine } from './StateMachine';
import { resolveNextNodes, checkEndCondition } from './DAGExecutor';
import { NodeRegistry } from '../nodes/NodeRegistry';
import { ExecutionContext } from '../nodes/base/ExecutionContext';
import type { PersistenceAdapter } from '../persistence/PersistenceAdapter';
import { InMemoryAdapter } from '../persistence/InMemoryAdapter';
import { registerAllBuiltinNodes } from '../nodes/builtin/register';

export class WorkflowEngine {
  private eventBus: EventBus;
  private nodeRegistry: NodeRegistry;
  private persistence: PersistenceAdapter;
  private running = false;
  private timerInterval?: ReturnType<typeof setInterval>;

  // Active executions tracked in memory for fast access
  private activeExecutions = new Map<string, {
    stateMachine: StateMachine;
    context: ExecutionContext;
    processDef: ProcessDefinition;
  }>();

  constructor(private config: EngineConfig = {}) {
    this.eventBus = new EventBus();
    this.nodeRegistry = new NodeRegistry();

    // Setup persistence
    if (config.persistence === 'prisma') {
      // Will be set externally via setPersistenceAdapter()
      this.persistence = new InMemoryAdapter(); // fallback
    } else {
      this.persistence = new InMemoryAdapter();
    }

    // Register all built-in nodes
    registerAllBuiltinNodes(this.nodeRegistry);
  }

  /**
   * Set a custom persistence adapter (e.g. PrismaAdapter).
   */
  setPersistenceAdapter(adapter: PersistenceAdapter): void {
    this.persistence = adapter;
  }

  /**
   * Get the node registry (for extending with custom nodes).
   */
  getNodeRegistry(): NodeRegistry {
    return this.nodeRegistry;
  }

  /**
   * Get the event bus (for subscribing to lifecycle events).
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  // ─── Lifecycle ──────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    // Start timer polling if enabled
    if (this.config.enableTimers !== false) {
      this.startTimerPolling();
    }

    console.log('[WorkflowEngine] Started');
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    console.log('[WorkflowEngine] Stopped');
  }

  // ─── Process Deployment ─────────────────────────────────────

  async deployProcess(def: ProcessDefinition): Promise<DeployResult> {
    // Validate the process definition
    this.validateProcessDefinition(def);

    await this.persistence.deployProcess(def);

    return {
      id: def.id,
      key: def.key,
      version: def.version,
      status: 'deployed',
    };
  }

  private validateProcessDefinition(def: ProcessDefinition): void {
    if (!def.id) throw new Error('ProcessDefinition must have an "id"');
    if (!def.key) throw new Error('ProcessDefinition must have a "key"');
    if (!def.name) throw new Error('ProcessDefinition must have a "name"');
    if (def.version < 1) throw new Error('ProcessDefinition version must be >= 1');
    if (!def.startAt) throw new Error('ProcessDefinition must have a "startAt"');
    if (!def.states || typeof def.states !== 'object') {
      throw new Error('ProcessDefinition must have a "states" object');
    }
    if (!def.states[def.startAt]) {
      throw new Error(`Start node "${def.startAt}" not found in states`);
    }

    // Validate that all referenced nodes exist
    const stateIds = new Set(Object.keys(def.states));
    for (const [nodeId, node] of Object.entries(def.states)) {
      if (node.next && !stateIds.has(node.next)) {
        throw new Error(`Node "${nodeId}" references unknown next node "${node.next}"`);
      }
      for (const choice of node.choices ?? []) {
        if (!stateIds.has(choice.next)) {
          throw new Error(`Node "${nodeId}" choice references unknown node "${choice.next}"`);
        }
      }
      for (const branch of node.branches ?? []) {
        if (!stateIds.has(branch.startAt)) {
          throw new Error(`Node "${nodeId}" branch references unknown node "${branch.startAt}"`);
        }
      }
    }
  }

  // ─── Execution ──────────────────────────────────────────────

  async startExecution(
    processKey: string,
    input: Record<string, unknown> = {},
    options?: StartOptions,
  ): Promise<string> {
    const processDef = await this.persistence.getLatestProcessDefinition(processKey);
    if (!processDef) {
      throw new Error(`Process definition "${processKey}" not found`);
    }

    const executionId = generateId();

    // Create execution record
    const execution: WorkflowExecution = {
      id: executionId,
      processDefinitionId: processDef.id,
      processDefinitionKey: processDef.key,
      processDefinitionVersion: processDef.version,
      status: 'pending',
      input,
      variables: { ...input, ...(options?.variables ?? {}) },
      currentRetryCount: 0,
      startedAt: new Date(),
      correlationId: options?.correlationId,
      tenantId: options?.tenantId,
    };

    await this.persistence.createExecution(execution);

    // Create state machine and context
    const stateMachine = new StateMachine(executionId, 'pending');
    const context = new ExecutionContext({
      executionId,
      processDefinition: processDef,
      input,
      variables: execution.variables,
      correlationId: options?.correlationId,
      tenantId: options?.tenantId,
    });

    this.activeExecutions.set(executionId, {
      stateMachine,
      context,
      processDef,
    });

    // Emit start event
    context.emitEvent('EXECUTION_STARTED', {
      processKey,
      version: processDef.version,
    });

    // Begin execution
    await this.executeWorkflow(executionId, processDef, stateMachine, context);

    return executionId;
  }

  /**
   * Execute the workflow from start to finish.
   */
  private async executeWorkflow(
    executionId: string,
    processDef: ProcessDefinition,
    stateMachine: StateMachine,
    ctx: ExecutionContext,
  ): Promise<void> {
    // Transition: pending → scheduled → running
    stateMachine.transition('scheduled');
    const startEvent = stateMachine.transition('running');
    await this.persistence.appendEvent(startEvent);
    await this.eventBus.emit(startEvent);

    let currentNodeId = processDef.startAt;
    const visitedNodes = new Set<string>();
    const maxIterations = 500;
    let iteration = 0;

    while (currentNodeId && iteration < maxIterations) {
      iteration++;

      // Prevent infinite loops
      if (visitedNodes.has(currentNodeId)) {
        // Allow revisiting for parallel join scenarios
        // But track to detect actual cycles
        const count = visitedNodes.size;
        if (iteration > count + 10) {
          await this.failExecution(executionId, stateMachine, 'Maximum iterations exceeded');
          return;
        }
      }
      visitedNodes.add(currentNodeId);

      const node = processDef.states[currentNodeId];
      if (!node) {
        await this.failExecution(executionId, stateMachine, `Node "${currentNodeId}" not found`);
        return;
      }

      // Execute the node
      const result = await this.executeNode(currentNodeId, node, ctx, executionId, stateMachine);

      if (result.status === 'failed') {
        // Check for error handlers
        const handler = node.catch?.find((h) =>
          !h.errorTypes || h.errorTypes.includes(result.error ?? ''),
        );

        if (handler?.next) {
          currentNodeId = handler.next;
          continue;
        }

        await this.failExecution(executionId, stateMachine, result.error ?? 'Node execution failed');
        return;
      }

      // Store result in context
      ctx.setResult(currentNodeId, result.output);

      // Check if this is a terminal node
      if (['EndEvent', 'SucceedState'].includes(node.type)) {
        await this.completeExecution(executionId, stateMachine, ctx);
        return;
      }

      if (node.type === 'FailState') {
        await this.failExecution(executionId, stateMachine, result.error ?? 'Failed');
        return;
      }

      // Resolve next node(s)
      const nextNodes = resolveNextNodes(currentNodeId, node, ctx);

      if (nextNodes.length === 0) {
        // No next node — execution ends
        await this.completeExecution(executionId, stateMachine, ctx);
        return;
      }

      if (nextNodes.length === 1) {
        currentNodeId = nextNodes[0];
      } else {
        // Parallel branches — execute all concurrently
        const results = await Promise.allSettled(
          nextNodes.map((nodeId) =>
            this.executeBranch(executionId, processDef, nodeId, ctx.fork(), stateMachine),
          ),
        );

        // Check if any branch failed
        const hasFailure = results.some(
          (r) => r.status === 'rejected',
        );

        if (hasFailure) {
          const errors = results
            .filter((r) => r.status === 'rejected')
            .map((r) => (r as PromiseRejectedResult).reason);
          await this.failExecution(
            executionId,
            stateMachine,
            `Parallel branch failed: ${JSON.stringify(errors)}`,
          );
          return;
        }

        // Merge results back into main context
        for (const result of results) {
          if (result.status === 'fulfilled') {
            const branchCtx = result.value as ExecutionContext;
            for (const [key, value] of Object.entries(branchCtx.variables)) {
              if (!ctx.getVar(key)) {
                ctx.setVar(key, value);
              }
            }
          }
        }

        // After parallel branches, continue with the next node after the gateway
        // Find the join point (the common successor of all branches)
        const joinNode = this.findJoinNode(currentNodeId, processDef);
        if (joinNode) {
          currentNodeId = joinNode;
        } else {
          // No explicit join — execution is complete
          await this.completeExecution(executionId, stateMachine, ctx);
          return;
        }
      }

      // Check end condition on the current node
      if (checkEndCondition(node, ctx)) {
        await this.completeExecution(executionId, stateMachine, ctx);
        return;
      }
    }

    await this.failExecution(executionId, stateMachine, 'Execution exceeded maximum iterations');
  }

  /**
   * Execute a single node.
   */
  private async executeNode(
    nodeId: string,
    node: import('../types').StateNode,
    ctx: ExecutionContext,
    executionId: string,
    stateMachine: StateMachine,
  ): Promise<NodeExecutionResult> {
    const handler = this.nodeRegistry.get(node.type);

    if (!handler) {
      return {
        nodeId,
        status: 'failed',
        error: `No handler registered for node type "${node.type}"`,
      };
    }

    try {
      const result = await handler.execute(nodeId, ctx, node.config);
      return result;
    } catch (err) {
      return {
        nodeId,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Execute a branch (for parallel gateways).
   */
  private async executeBranch(
    executionId: string,
    processDef: ProcessDefinition,
    startNodeId: string,
    ctx: ExecutionContext,
    stateMachine: StateMachine,
  ): Promise<ExecutionContext> {
    let currentNodeId = startNodeId;

    while (currentNodeId) {
      const node = processDef.states[currentNodeId];
      if (!node) break;

      const result = await this.executeNode(currentNodeId, node, ctx, executionId, stateMachine);

      if (result.status === 'failed') {
        throw new Error(`Branch failed at "${currentNodeId}": ${result.error}`);
      }

      ctx.setResult(currentNodeId, result.output);

      // Terminal nodes end the branch
      if (['EndEvent', 'SucceedState'].includes(node.type)) break;

      // Resolve next
      const nextNodes = resolveNextNodes(currentNodeId, node, ctx);
      currentNodeId = nextNodes[0] ?? undefined;
    }

    return ctx;
  }

  /**
   * Find the join node after a parallel gateway.
   */
  private findJoinNode(
    gatewayId: string,
    processDef: ProcessDefinition,
  ): string | null {
    // Look for a node that all branches converge to
    const gateway = processDef.states[gatewayId];
    if (!gateway) return null;

    // Simple heuristic: find the first node referenced by multiple "next" pointers
    const targetCounts = new Map<string, number>();
    for (const [, node] of Object.entries(processDef.states)) {
      if (node.next) targetCounts.set(node.next, (targetCounts.get(node.next) ?? 0) + 1);
    }

    for (const [nodeId, count] of targetCounts.entries()) {
      if (count > 1) return nodeId;
    }

    return null;
  }

  // ─── Execution Completion / Failure ────────────────────────

  private async completeExecution(
    executionId: string,
    stateMachine: StateMachine,
    ctx: ExecutionContext,
  ): Promise<void> {
    const event = stateMachine.transition('successful');
    await this.persistence.appendEvent(event);
    await this.eventBus.emit(event);

    await this.persistence.updateExecutionStatus(executionId, 'successful', {
      completedAt: new Date().toISOString(),
      variables: ctx.variables,
    });

    this.activeExecutions.delete(executionId);
  }

  private async failExecution(
    executionId: string,
    stateMachine: StateMachine,
    reason: string,
  ): Promise<void> {
    const event = stateMachine.transition('failed', reason);
    await this.persistence.appendEvent(event);
    await this.eventBus.emit(event);

    await this.persistence.updateExecutionStatus(executionId, 'failed', {
      completedAt: new Date().toISOString(),
      failedReason: reason,
    });

    this.activeExecutions.delete(executionId);
  }

  // ─── Execution Control ──────────────────────────────────────

  async cancelExecution(executionId: string): Promise<void> {
    const entry = this.activeExecutions.get(executionId);
    if (!entry) {
      await this.persistence.updateExecutionStatus(executionId, 'cancelled', {
        completedAt: new Date().toISOString(),
      });
      return;
    }

    const { stateMachine } = entry;
    if (stateMachine.isTerminal) return;

    const event = stateMachine.transition('cancelled');
    await this.persistence.appendEvent(event);
    await this.eventBus.emit(event);

    await this.persistence.updateExecutionStatus(executionId, 'cancelled', {
      completedAt: new Date().toISOString(),
    });

    this.activeExecutions.delete(executionId);
  }

  // ─── User Task Operations ──────────────────────────────────

  async completeTask(taskId: string, result: Record<string, unknown>): Promise<void> {
    await this.persistence.completeUserTask(taskId, result);

    // Find the execution and resume it
    const task = await this.persistence.getUserTask(taskId);
    if (task) {
      const entry = this.activeExecutions.get(task.executionId);
      if (entry) {
        entry.context.setVar(`task.${taskId}`, result);
        // Resume execution from the node after the UserTask
        // This is handled by the engine's continuation logic
      }
    }
  }

  async rejectTask(taskId: string, reason: string): Promise<void> {
    await this.persistence.rejectUserTask(taskId, reason);
  }

  async delegateTask(taskId: string, toUserId: string): Promise<void> {
    await this.persistence.delegateUserTask(taskId, toUserId);
  }

  async listMyTasks(userId: string): Promise<UserTaskInstance[]> {
    return this.persistence.listUserTasks(userId);
  }

  // ─── Signal / Message ──────────────────────────────────────

  async sendSignal(executionId: string, signal: SignalEvent): Promise<void> {
    const entry = this.activeExecutions.get(executionId);
    if (!entry) return;

    entry.context.setVar(`signal.${signal.signalName}`, signal.data);
    entry.context.emitEvent('SIGNAL_RECEIVED', {
      signalName: signal.signalName,
      data: signal.data,
    });
  }

  // ─── Queries ────────────────────────────────────────────────

  async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    return this.persistence.getExecution(executionId);
  }

  async getExecutionGraph(executionId: string): Promise<ExecutionGraph> {
    const snapshots = await this.persistence.getNodeSnapshots(executionId);
    const execution = await this.persistence.getExecution(executionId);

    if (!execution) {
      return { executionId, nodes: [], edges: [] };
    }

    const processDef = await this.persistence.getLatestProcessDefinition(
      execution.processDefinitionKey,
    );

    if (!processDef) {
      return { executionId, nodes: [], edges: [] };
    }

    const snapshotMap = new Map(snapshots.map((s) => [s.nodeId, s]));

    const graphNodes = Object.entries(processDef.states).map(([id, node]) => ({
      id,
      name: id,
      type: node.type,
      status: snapshotMap.get(id)?.status,
    }));

    const graphEdges: import('../types').GraphEdge[] = [];
    for (const [id, node] of Object.entries(processDef.states)) {
      if (node.next) {
        graphEdges.push({
          id: `${id}__${node.next}`,
          source: id,
          target: node.next,
          taken: snapshotMap.get(id)?.status !== undefined,
        });
      }
      for (const choice of node.choices ?? []) {
        graphEdges.push({
          id: `${id}__choice__${choice.next}`,
          source: id,
          target: choice.next,
          label: 'choice',
        });
      }
    }

    return { executionId, nodes: graphNodes, edges: graphEdges };
  }

  async listExecutions(filter?: {
    tenantId?: string;
    status?: string;
    limit?: number;
  }): Promise<WorkflowExecution[]> {
    return this.persistence.listExecutions(filter);
  }

  // ─── Timer Polling ─────────────────────────────────────────

  private startTimerPolling(): void {
    this.timerInterval = setInterval(async () => {
      if (!this.running) return;

      try {
        const dueTimers = await this.persistence.getDueTimers();
        for (const timer of dueTimers) {
          await this.handleTimerFired(timer);
        }
      } catch (err) {
        console.error('[WorkflowEngine] Timer polling error:', err);
      }
    }, 5000); // Poll every 5 seconds
  }

  private async handleTimerFired(timer: TimerEntry): Promise<void> {
    await this.persistence.updateTimerStatus(timer.id, 'fired');

    if (timer.executionId) {
      const entry = this.activeExecutions.get(timer.executionId);
      if (entry) {
        entry.context.emitEvent('TIMER_FIRED', {
          timerId: timer.id,
          data: timer.callbackData,
        });
      }
    }
  }
}
