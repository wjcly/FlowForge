// ============================================================
// PersistenceAdapter — interface for workflow state persistence
// ============================================================

import type {
  ProcessDefinition,
  WorkflowExecution,
  NodeSnapshot,
  ExecutionEvent,
  UserTaskInstance,
  TimerEntry,
} from '../types';

export interface FilterOptions {
  tenantId?: string;
  status?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Abstract persistence adapter that all storage backends must implement.
 */
export abstract class PersistenceAdapter {
  // ─── Process Definitions ──────────────────────────────────

  abstract deployProcess(def: ProcessDefinition): Promise<void>;

  abstract getProcessDefinition(
    id: string,
    version?: number,
  ): Promise<ProcessDefinition | null>;

  abstract getLatestProcessDefinition(
    key: string,
  ): Promise<ProcessDefinition | null>;

  abstract listProcessDefinitions(
    filter?: FilterOptions,
  ): Promise<ProcessDefinition[]>;

  abstract removeProcessDefinition(id: string): Promise<boolean>;

  // ─── Workflow Executions ──────────────────────────────────

  abstract createExecution(exec: WorkflowExecution): Promise<void>;

  abstract getExecution(id: string): Promise<WorkflowExecution | null>;

  abstract updateExecutionStatus(
    id: string,
    status: string,
    metadata?: Record<string, unknown>,
  ): Promise<void>;

  abstract listExecutions(filter?: FilterOptions): Promise<WorkflowExecution[]>;

  // ─── Node Snapshots ───────────────────────────────────────

  abstract saveNodeSnapshot(snapshot: NodeSnapshot): Promise<void>;

  abstract saveNodeSnapshots(snapshots: NodeSnapshot[]): Promise<void>;

  abstract getNodeSnapshots(executionId: string): Promise<NodeSnapshot[]>;

  // ─── Execution Events (Event Sourcing) ────────────────────

  abstract appendEvent(event: ExecutionEvent): Promise<void>;

  abstract appendEvents(events: ExecutionEvent[]): Promise<void>;

  abstract getEvents(
    executionId: string,
    fromOffset?: number,
  ): Promise<ExecutionEvent[]>;

  // ─── User Tasks ───────────────────────────────────────────

  abstract createUserTask(task: UserTaskInstance): Promise<void>;

  abstract getUserTask(id: string): Promise<UserTaskInstance | null>;

  abstract assignUserTask(
    taskId: string,
    userId: string,
  ): Promise<void>;

  abstract completeUserTask(
    taskId: string,
    result?: Record<string, unknown>,
  ): Promise<void>;

  abstract rejectUserTask(
    taskId: string,
    reason: string,
  ): Promise<void>;

  abstract delegateUserTask(
    taskId: string,
    toUserId: string,
  ): Promise<void>;

  abstract listUserTasks(
    userId: string,
    filter?: FilterOptions,
  ): Promise<UserTaskInstance[]>;

  // ─── Timers ───────────────────────────────────────────────

  abstract scheduleTimer(timer: TimerEntry): Promise<void>;

  abstract getDueTimers(): Promise<TimerEntry[]>;

  abstract updateTimerStatus(
    timerId: string,
    status: 'fired' | 'failed',
  ): Promise<void>;
}
