// ============================================================
// InMemoryAdapter — in-memory persistence (dev / testing)
// ============================================================

import type {
  ProcessDefinition,
  WorkflowExecution,
  NodeSnapshot,
  ExecutionEvent,
  UserTaskInstance,
  TimerEntry,
} from '../types';
import { PersistenceAdapter, type FilterOptions } from './PersistenceAdapter';
import { deepClone } from '../utils';

export class InMemoryAdapter extends PersistenceAdapter {
  private processDefinitions = new Map<string, ProcessDefinition>();
  private executions = new Map<string, WorkflowExecution>();
  private nodeSnapshots = new Map<string, NodeSnapshot[]>();
  private events = new Map<string, ExecutionEvent[]>();
  private userTasks = new Map<string, UserTaskInstance>();
  private timers = new Map<string, TimerEntry>();

  // ─── Process Definitions ──────────────────────────────────

  async deployProcess(def: ProcessDefinition): Promise<void> {
    this.processDefinitions.set(def.id, deepClone(def));
  }

  async getProcessDefinition(id: string, version?: number): Promise<ProcessDefinition | null> {
    const def = this.processDefinitions.get(id);
    if (!def) return null;
    if (version != null && def.version !== version) return null;
    return deepClone(def);
  }

  async getLatestProcessDefinition(key: string): Promise<ProcessDefinition | null> {
    let latest: ProcessDefinition | null = null;
    for (const def of this.processDefinitions.values()) {
      if (def.key === key) {
        if (!latest || def.version > latest.version) {
          latest = def;
        }
      }
    }
    return latest ? deepClone(latest) : null;
  }

  async listProcessDefinitions(filter?: FilterOptions): Promise<ProcessDefinition[]> {
    const results: ProcessDefinition[] = [];
    for (const def of this.processDefinitions.values()) {
      if (filter?.tenantId && def.tenantId !== filter.tenantId) continue;
      results.push(deepClone(def));
    }
    return results.slice(0, filter?.limit ?? results.length);
  }

  async removeProcessDefinition(id: string): Promise<boolean> {
    return this.processDefinitions.delete(id);
  }

  // ─── Workflow Executions ──────────────────────────────────

  async createExecution(exec: WorkflowExecution): Promise<void> {
    this.executions.set(exec.id, deepClone(exec));
  }

  async getExecution(id: string): Promise<WorkflowExecution | null> {
    const exec = this.executions.get(id);
    return exec ? deepClone(exec) : null;
  }

  async updateExecutionStatus(
    id: string,
    status: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const exec = this.executions.get(id);
    if (!exec) return;
    exec.status = status as WorkflowExecution['status'];
    if (metadata?.completedAt) {
      exec.completedAt = new Date(metadata.completedAt as string);
    }
    if (metadata?.failedReason) {
      exec.failedReason = metadata.failedReason as string;
    }
    if (metadata?.failedError) {
      exec.failedError = metadata.failedError as string;
    }
    if (metadata?.variables) {
      exec.variables = { ...exec.variables, ...(metadata.variables as Record<string, unknown>) };
    }
  }

  async listExecutions(filter?: FilterOptions): Promise<WorkflowExecution[]> {
    const results: WorkflowExecution[] = [];
    for (const exec of this.executions.values()) {
      if (filter?.tenantId && exec.tenantId !== filter.tenantId) continue;
      if (filter?.status && exec.status !== filter.status) continue;
      results.push(deepClone(exec));
    }
    return results.slice(0, filter?.limit ?? results.length);
  }

  // ─── Node Snapshots ───────────────────────────────────────

  async saveNodeSnapshot(snapshot: NodeSnapshot): Promise<void> {
    const list = this.nodeSnapshots.get(snapshot.executionId) ?? [];
    list.push(deepClone(snapshot));
    this.nodeSnapshots.set(snapshot.executionId, list);
  }

  async saveNodeSnapshots(snapshots: NodeSnapshot[]): Promise<void> {
    for (const snapshot of snapshots) {
      const list = this.nodeSnapshots.get(snapshot.executionId) ?? [];
      list.push(deepClone(snapshot));
      this.nodeSnapshots.set(snapshot.executionId, list);
    }
  }

  async getNodeSnapshots(executionId: string): Promise<NodeSnapshot[]> {
    return deepClone(this.nodeSnapshots.get(executionId) ?? []);
  }

  // ─── Execution Events ─────────────────────────────────────

  async appendEvent(event: ExecutionEvent): Promise<void> {
    const list = this.events.get(event.executionId) ?? [];
    list.push(deepClone(event));
    this.events.set(event.executionId, list);
  }

  async appendEvents(events: ExecutionEvent[]): Promise<void> {
    for (const event of events) {
      const list = this.events.get(event.executionId) ?? [];
      list.push(deepClone(event));
      this.events.set(event.executionId, list);
    }
  }

  async getEvents(executionId: string, fromOffset = 0): Promise<ExecutionEvent[]> {
    const list = this.events.get(executionId) ?? [];
    return deepClone(list.slice(fromOffset));
  }

  // ─── User Tasks ───────────────────────────────────────────

  async createUserTask(task: UserTaskInstance): Promise<void> {
    this.userTasks.set(task.id, deepClone(task));
  }

  async getUserTask(id: string): Promise<UserTaskInstance | null> {
    const task = this.userTasks.get(id);
    return task ? deepClone(task) : null;
  }

  async assignUserTask(taskId: string, userId: string): Promise<void> {
    const task = this.userTasks.get(taskId);
    if (task) {
      task.assigneeId = userId;
      task.status = 'assigned';
    }
  }

  async completeUserTask(
    taskId: string,
    result?: Record<string, unknown>,
  ): Promise<void> {
    const task = this.userTasks.get(taskId);
    if (task) {
      task.status = 'completed';
      task.formResult = result ?? {};
      task.completedAt = new Date();
    }
  }

  async rejectUserTask(taskId: string, reason: string): Promise<void> {
    const task = this.userTasks.get(taskId);
    if (task) {
      task.status = 'rejected';
      task.comment = reason;
      task.completedAt = new Date();
    }
  }

  async delegateUserTask(taskId: string, toUserId: string): Promise<void> {
    const task = this.userTasks.get(taskId);
    if (task) {
      task.assigneeId = toUserId;
      task.status = 'delegated';
    }
  }

  async listUserTasks(userId: string, filter?: FilterOptions): Promise<UserTaskInstance[]> {
    const results: UserTaskInstance[] = [];
    for (const task of this.userTasks.values()) {
      if (task.assigneeId !== userId) continue;
      if (filter?.status && task.status !== filter.status) continue;
      results.push(deepClone(task));
    }
    return results.slice(0, filter?.limit ?? results.length);
  }

  // ─── Timers ───────────────────────────────────────────────

  async scheduleTimer(timer: TimerEntry): Promise<void> {
    this.timers.set(timer.id, deepClone(timer));
  }

  async getDueTimers(): Promise<TimerEntry[]> {
    const now = new Date();
    const due: TimerEntry[] = [];
    for (const timer of this.timers.values()) {
      if (timer.status === 'pending' && timer.fireAt <= now) {
        due.push(deepClone(timer));
      }
    }
    return due;
  }

  async updateTimerStatus(
    timerId: string,
    status: 'fired' | 'failed',
  ): Promise<void> {
    const timer = this.timers.get(timerId);
    if (timer) {
      timer.status = status;
    }
  }
}
