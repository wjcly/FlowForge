// ============================================================
// PrismaPersistenceAdapter — PostgreSQL-backed persistence via Prisma
// ============================================================

import { PrismaClient } from '@prisma/client';
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

// ─── Prisma ↔ Domain Type Mappers ─────────────────────────────

function toDomainProcessDefinition(r: any): ProcessDefinition {
  return {
    id: r.id,
    key: r.key,
    name: r.name,
    version: r.version,
    description: r.description ?? undefined,
    startAt: r.startAt,
    timeoutSeconds: r.timeoutSeconds ?? undefined,
    retryPolicy: r.retryPolicy ? JSON.parse(r.retryPolicy) : undefined,
    states: JSON.parse(r.states),
    output: r.outputMapping ? JSON.parse(r.outputMapping) : undefined,
    tenantId: r.tenantId ?? undefined,
    createdBy: r.createdBy ?? undefined,
    createdAt: r.createdAt?.toISOString() ?? undefined,
    updatedAt: r.updatedAt?.toISOString() ?? undefined,
  };
}

function toPrismaProcessDefinition(d: ProcessDefinition) {
  return {
    id: d.id,
    key: d.key,
    name: d.name,
    version: d.version,
    description: d.description ?? null,
    startAt: d.startAt,
    timeoutSeconds: d.timeoutSeconds ?? null,
    retryPolicy: d.retryPolicy ? JSON.stringify(d.retryPolicy) : null,
    states: JSON.stringify(d.states),
    outputMapping: d.output ? JSON.stringify(d.output) : null,
    tenantId: d.tenantId ?? null,
    createdBy: d.createdBy ?? null,
  };
}

function toDomainExecution(r: any): WorkflowExecution {
  return {
    id: r.id,
    processDefinitionId: r.processDefinitionId,
    processDefinitionKey: r.processDefinitionKey,
    processDefinitionVersion: r.processDefinitionVersion,
    status: r.status,
    input: r.input ? JSON.parse(r.input) : undefined,
    output: r.output ? JSON.parse(r.output) : undefined,
    variables: JSON.parse(r.variables),
    currentActivityId: r.currentActivityId ?? undefined,
    currentRetryCount: r.currentRetryCount,
    startedAt: r.startedAt,
    completedAt: r.completedAt ?? undefined,
    failedReason: r.failedReason ?? undefined,
    failedError: r.failedError ?? undefined,
    tenantId: r.tenantId ?? undefined,
    correlationId: r.correlationId ?? undefined,
  };
}

function toPrismaExecution(d: WorkflowExecution) {
  return {
    id: d.id,
    processDefinitionId: d.processDefinitionId,
    processDefinitionKey: d.processDefinitionKey,
    processDefinitionVersion: d.processDefinitionVersion,
    status: d.status,
    input: d.input ? JSON.stringify(d.input) : null,
    output: d.output ? JSON.stringify(d.output) : null,
    variables: JSON.stringify(d.variables ?? {}),
    currentActivityId: d.currentActivityId ?? null,
    currentRetryCount: d.currentRetryCount,
    startedAt: d.startedAt instanceof Date ? d.startedAt : new Date(d.startedAt),
    completedAt: d.completedAt ? (d.completedAt instanceof Date ? d.completedAt : new Date(d.completedAt)) : null,
    failedReason: d.failedReason ?? null,
    failedError: d.failedError ?? null,
    tenantId: d.tenantId ?? null,
    correlationId: d.correlationId ?? null,
  };
}

function toDomainNodeSnapshot(r: any): NodeSnapshot {
  return {
    id: r.id,
    executionId: r.executionId,
    nodeId: r.nodeId,
    nodeName: r.nodeName ?? undefined,
    nodeType: r.nodeType,
    status: r.status,
    input: r.input ? JSON.parse(r.input) : undefined,
    output: r.output ? JSON.parse(r.output) : undefined,
    error: r.error ?? undefined,
    retryCount: r.retryCount,
    startedAt: r.startedAt ?? undefined,
    completedAt: r.completedAt ?? undefined,
    orderIndex: r.orderIndex,
  };
}

function toPrismaNodeSnapshot(d: NodeSnapshot) {
  return {
    id: d.id,
    executionId: d.executionId,
    nodeId: d.nodeId,
    nodeName: d.nodeName ?? null,
    nodeType: d.nodeType,
    status: d.status,
    input: d.input ? JSON.stringify(d.input) : null,
    output: d.output ? JSON.stringify(d.output) : null,
    error: d.error ?? null,
    retryCount: d.retryCount,
    startedAt: d.startedAt ? (d.startedAt instanceof Date ? d.startedAt : new Date(d.startedAt)) : null,
    completedAt: d.completedAt ? (d.completedAt instanceof Date ? d.completedAt : new Date(d.completedAt)) : null,
    orderIndex: d.orderIndex,
  };
}

function toDomainEvent(r: any): ExecutionEvent {
  return {
    id: r.id,
    executionId: r.executionId,
    eventType: r.eventType,
    nodeId: r.nodeId ?? undefined,
    payload: r.payload ? JSON.parse(r.payload) : undefined,
    sequenceNumber: r.sequenceNumber,
    createdAt: r.createdAt,
  };
}

function toPrismaEvent(d: ExecutionEvent) {
  return {
    id: d.id,
    executionId: d.executionId,
    eventType: d.eventType,
    nodeId: d.nodeId ?? null,
    payload: d.payload ? JSON.stringify(d.payload) : null,
    sequenceNumber: d.sequenceNumber,
    createdAt: d.createdAt instanceof Date ? d.createdAt : new Date(d.createdAt),
  };
}

function toDomainUserTask(r: any): UserTaskInstance {
  return {
    id: r.id,
    executionId: r.executionId,
    nodeId: r.nodeId,
    assigneeId: r.assigneeId ?? undefined,
    candidateUsers: r.candidateUsers ? JSON.parse(r.candidateUsers) : undefined,
    candidateGroups: r.candidateGroups ? JSON.parse(r.candidateGroups) : undefined,
    status: r.status,
    formDefinition: r.formDefinition ? JSON.parse(r.formDefinition) : undefined,
    formResult: r.formResult ? JSON.parse(r.formResult) : undefined,
    comment: r.comment ?? undefined,
    priority: r.priority,
    dueDate: r.dueDate ?? undefined,
    slaDeadline: r.slaDeadline ?? undefined,
    createdBy: r.createdBy ?? undefined,
    completedBy: r.completedBy ?? undefined,
    completedAt: r.completedAt ?? undefined,
    createdAt: r.createdAt,
  };
}

function toPrismaUserTask(d: UserTaskInstance) {
  return {
    id: d.id,
    executionId: d.executionId,
    nodeId: d.nodeId,
    assigneeId: d.assigneeId ?? null,
    candidateUsers: d.candidateUsers ? JSON.stringify(d.candidateUsers) : null,
    candidateGroups: d.candidateGroups ? JSON.stringify(d.candidateGroups) : null,
    status: d.status,
    formDefinition: d.formDefinition ? JSON.stringify(d.formDefinition) : null,
    formResult: d.formResult ? JSON.stringify(d.formResult) : null,
    comment: d.comment ?? null,
    priority: d.priority,
    dueDate: d.dueDate ? (d.dueDate instanceof Date ? d.dueDate : new Date(d.dueDate)) : null,
    slaDeadline: d.slaDeadline ? (d.slaDeadline instanceof Date ? d.slaDeadline : new Date(d.slaDeadline)) : null,
    createdBy: d.createdBy ?? null,
    completedBy: d.completedBy ?? null,
    completedAt: d.completedAt ? (d.completedAt instanceof Date ? d.completedAt : new Date(d.completedAt)) : null,
    createdAt: d.createdAt instanceof Date ? d.createdAt : new Date(d.createdAt),
  };
}

function toDomainTimer(r: any): TimerEntry {
  return {
    id: r.id,
    executionId: r.executionId ?? undefined,
    callbackType: r.callbackType as TimerEntry['callbackType'],
    callbackData: JSON.parse(r.callbackData),
    fireAt: r.fireAt,
    retries: r.retries,
    maxRetries: r.maxRetries,
    status: r.status as TimerEntry['status'],
    createdAt: r.createdAt,
  };
}

function toPrismaTimer(d: TimerEntry) {
  return {
    id: d.id,
    executionId: d.executionId ?? null,
    callbackType: d.callbackType,
    callbackData: JSON.stringify(d.callbackData),
    fireAt: d.fireAt instanceof Date ? d.fireAt : new Date(d.fireAt),
    retries: d.retries,
    maxRetries: d.maxRetries,
    status: d.status,
    createdAt: d.createdAt instanceof Date ? d.createdAt : new Date(d.createdAt),
  };
}

// ─── Adapter Implementation ────────────────────────────────────

export class PrismaPersistenceAdapter extends PersistenceAdapter {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    super();
    this.prisma = prisma ?? new PrismaClient();
  }

  /** Release the underlying Prisma connection. */
  async destroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  // ─── Process Definitions ──────────────────────────────────

  async deployProcess(def: ProcessDefinition): Promise<void> {
    const data = toPrismaProcessDefinition(def);
    await this.prisma.processDefinitionRecord.upsert({
      where: { key_version: { key: data.key, version: data.version } },
      update: data,
      create: data,
    });
  }

  async getProcessDefinition(id: string, version?: number): Promise<ProcessDefinition | null> {
    const where: Record<string, unknown> = { id };
    if (version != null) where.version = version;
    const record = await this.prisma.processDefinitionRecord.findUnique({ where: { id } });
    if (!record) return null;
    return toDomainProcessDefinition(record);
  }

  async getLatestProcessDefinition(key: string): Promise<ProcessDefinition | null> {
    const record = await this.prisma.processDefinitionRecord.findFirst({
      where: { key },
      orderBy: { version: 'desc' },
    });
    if (!record) return null;
    return toDomainProcessDefinition(record);
  }

  async listProcessDefinitions(filter?: FilterOptions): Promise<ProcessDefinition[]> {
    const where: Record<string, unknown> = {};
    if (filter?.tenantId) where.tenantId = filter.tenantId;

    const records = await this.prisma.processDefinitionRecord.findMany({
      where,
      orderBy: filter?.sortBy
        ? { [filter.sortBy]: filter.sortOrder ?? 'asc' }
        : { createdAt: 'desc' },
      take: filter?.limit,
      skip: filter?.offset ?? 0,
    });

    return records.map(toDomainProcessDefinition);
  }

  async removeProcessDefinition(id: string): Promise<boolean> {
    const result = await this.prisma.processDefinitionRecord.deleteMany({ where: { id } });
    return result.count > 0;
  }

  // ─── Workflow Executions ──────────────────────────────────

  async createExecution(exec: WorkflowExecution): Promise<void> {
    const data = toPrismaExecution(exec);
    await this.prisma.workflowEngineExecution.create({ data });
  }

  async getExecution(id: string): Promise<WorkflowExecution | null> {
    const record = await this.prisma.workflowEngineExecution.findUnique({ where: { id } });
    if (!record) return null;
    return toDomainExecution(record);
  }

  async updateExecutionStatus(
    id: string,
    status: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status };
    if (metadata?.completedAt) {
      updateData.completedAt = new Date(metadata.completedAt as string);
    }
    if (metadata?.failedReason) {
      updateData.failedReason = metadata.failedReason as string;
    }
    if (metadata?.failedError) {
      updateData.failedError = metadata.failedError as string;
    }
    if (metadata?.variables) {
      // Merge variables: read current, merge, write back
      const existing = await this.prisma.workflowEngineExecution.findUnique({ where: { id } });
      if (existing) {
        const currentVars = JSON.parse(existing.variables);
        const merged = { ...currentVars, ...(metadata.variables as Record<string, unknown>) };
        updateData.variables = JSON.stringify(merged);
      }
    }
    await this.prisma.workflowEngineExecution.update({ where: { id }, data: updateData });
  }

  async listExecutions(filter?: FilterOptions): Promise<WorkflowExecution[]> {
    const where: Record<string, unknown> = {};
    if (filter?.tenantId) where.tenantId = filter.tenantId;
    if (filter?.status) where.status = filter.status;

    const records = await this.prisma.workflowEngineExecution.findMany({
      where,
      orderBy: filter?.sortBy
        ? { [filter.sortBy]: filter.sortOrder ?? 'asc' }
        : { startedAt: 'desc' },
      take: filter?.limit,
      skip: filter?.offset ?? 0,
    });

    return records.map(toDomainExecution);
  }

  // ─── Node Snapshots ───────────────────────────────────────

  async saveNodeSnapshot(snapshot: NodeSnapshot): Promise<void> {
    const data = toPrismaNodeSnapshot(snapshot);
    await this.prisma.nodeSnapshotRecord.create({ data });
  }

  async saveNodeSnapshots(snapshots: NodeSnapshot[]): Promise<void> {
    const data = snapshots.map(toPrismaNodeSnapshot);
    await this.prisma.nodeSnapshotRecord.createMany({ data });
  }

  async getNodeSnapshots(executionId: string): Promise<NodeSnapshot[]> {
    const records = await this.prisma.nodeSnapshotRecord.findMany({
      where: { executionId },
      orderBy: { orderIndex: 'asc' },
    });
    return records.map(toDomainNodeSnapshot);
  }

  // ─── Execution Events (Event Sourcing) ────────────────────

  async appendEvent(event: ExecutionEvent): Promise<void> {
    const data = toPrismaEvent(event);
    await this.prisma.executionEventRecord.create({ data });
  }

  async appendEvents(events: ExecutionEvent[]): Promise<void> {
    const data = events.map(toPrismaEvent);
    await this.prisma.executionEventRecord.createMany({ data });
  }

  async getEvents(executionId: string, fromOffset = 0): Promise<ExecutionEvent[]> {
    const records = await this.prisma.executionEventRecord.findMany({
      where: { executionId },
      orderBy: { sequenceNumber: 'asc' },
      skip: fromOffset,
    });
    return records.map(toDomainEvent);
  }

  // ─── User Tasks ───────────────────────────────────────────

  async createUserTask(task: UserTaskInstance): Promise<void> {
    const data = toPrismaUserTask(task);
    await this.prisma.userTaskRecord.create({ data });
  }

  async getUserTask(id: string): Promise<UserTaskInstance | null> {
    const record = await this.prisma.userTaskRecord.findUnique({ where: { id } });
    if (!record) return null;
    return toDomainUserTask(record);
  }

  async assignUserTask(taskId: string, userId: string): Promise<void> {
    await this.prisma.userTaskRecord.update({
      where: { id: taskId },
      data: { assigneeId: userId, status: 'assigned' },
    });
  }

  async completeUserTask(
    taskId: string,
    result?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.userTaskRecord.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        formResult: result ? JSON.stringify(result) : null,
        completedAt: new Date(),
      },
    });
  }

  async rejectUserTask(taskId: string, reason: string): Promise<void> {
    await this.prisma.userTaskRecord.update({
      where: { id: taskId },
      data: { status: 'rejected', comment: reason, completedAt: new Date() },
    });
  }

  async delegateUserTask(taskId: string, toUserId: string): Promise<void> {
    await this.prisma.userTaskRecord.update({
      where: { id: taskId },
      data: { assigneeId: toUserId, status: 'delegated' },
    });
  }

  async listUserTasks(userId: string, filter?: FilterOptions): Promise<UserTaskInstance[]> {
    const where: Record<string, unknown> = { assigneeId: userId };
    if (filter?.status) where.status = filter.status;

    const records = await this.prisma.userTaskRecord.findMany({
      where,
      orderBy: { priority: 'desc', createdAt: 'asc' },
      take: filter?.limit,
      skip: filter?.offset ?? 0,
    });

    return records.map(toDomainUserTask);
  }

  // ─── Timers ───────────────────────────────────────────────

  async scheduleTimer(timer: TimerEntry): Promise<void> {
    const data = toPrismaTimer(timer);
    await this.prisma.timerRecord.create({ data });
  }

  async getDueTimers(): Promise<TimerEntry[]> {
    const now = new Date();
    const records = await this.prisma.timerRecord.findMany({
      where: {
        status: 'pending',
        fireAt: { lte: now },
      },
    });
    return records.map(toDomainTimer);
  }

  async updateTimerStatus(
    timerId: string,
    status: 'fired' | 'failed',
  ): Promise<void> {
    await this.prisma.timerRecord.update({
      where: { id: timerId },
      data: { status },
    });
  }
}
