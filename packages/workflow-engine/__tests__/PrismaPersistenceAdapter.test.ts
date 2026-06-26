// ============================================================
// PrismaPersistenceAdapter.test.ts — unit tests with mocked PrismaClient
// ============================================================

import { describe, it, beforeEach, expect, vi } from 'vitest';

// Mock @prisma/client
const mockPrismaMethods = {
  processDefinitionRecord: {
    upsert: vi.fn().mockResolvedValue({}),
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  workflowEngineExecution: {
    create: vi.fn().mockResolvedValue({}),
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({}),
  },
  nodeSnapshotRecord: {
    create: vi.fn().mockResolvedValue({}),
    createMany: vi.fn().mockResolvedValue({}),
    findMany: vi.fn().mockResolvedValue([]),
  },
  executionEventRecord: {
    create: vi.fn().mockResolvedValue({}),
    createMany: vi.fn().mockResolvedValue({}),
    findMany: vi.fn().mockResolvedValue([]),
  },
  userTaskRecord: {
    create: vi.fn().mockResolvedValue({}),
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({}),
  },
  timerRecord: {
    create: vi.fn().mockResolvedValue({}),
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({}),
  },
  $disconnect: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrismaMethods),
}));

import { PrismaClient } from '@prisma/client';
import { PrismaPersistenceAdapter } from '../src/persistence/PrismaPersistenceAdapter';

describe('PrismaPersistenceAdapter', () => {
  let adapter: PrismaPersistenceAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new PrismaPersistenceAdapter(new PrismaClient() as any);
  });

  it('should deploy a process definition', async () => {
    const def = {
      id: 'test-def-1',
      key: 'test-key',
      name: 'Test Process',
      version: 1,
      startAt: 'Start',
      states: { Start: { type: 'StartEvent' } },
    };

    await adapter.deployProcess(def as any);
    
    expect(mockPrismaMethods.processDefinitionRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key_version: { key: 'test-key', version: 1 } },
      }),
    );
  });

  it('should get latest process definition by key', async () => {
    mockPrismaMethods.processDefinitionRecord.findFirst.mockResolvedValueOnce({
      id: 'def-1', key: 'order-approval', name: 'Order Approval', version: 2,
      startAt: 'Start', states: '{}', retryPolicy: null, outputMapping: null,
      description: null, timeoutSeconds: null, tenantId: null, createdBy: null,
    });

    const result = await adapter.getLatestProcessDefinition('order-approval');
    
    expect(result).not.toBeNull();
    expect(result!.key).toBe('order-approval');
  });

  it('should create and retrieve a workflow execution', async () => {
    const exec = {
      id: 'exec-1',
      processDefinitionId: 'def-1',
      processDefinitionKey: 'test-key',
      processDefinitionVersion: 1,
      status: 'running',
      variables: {},
      currentRetryCount: 0,
      startedAt: new Date(),
    };

    await adapter.createExecution(exec as any);
    
    expect(mockPrismaMethods.workflowEngineExecution.create).toHaveBeenCalled();
  });

  it('should update execution status with metadata', async () => {
    mockPrismaMethods.workflowEngineExecution.findUnique.mockResolvedValueOnce({
      variables: JSON.stringify({ a: 1 }),
    });

    await adapter.updateExecutionStatus('exec-1', 'successful', {
      completedAt: new Date().toISOString(),
    });

    expect(mockPrismaMethods.workflowEngineExecution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'exec-1' },
        data: expect.objectContaining({ status: 'successful' }),
      }),
    );
  });

  it('should save and retrieve node snapshots', async () => {
    const snapshot = {
      id: 'snap-1',
      executionId: 'exec-1',
      nodeId: 'Node1',
      nodeType: 'ServiceTask',
      status: 'success',
      retryCount: 0,
      orderIndex: 0,
    };

    await adapter.saveNodeSnapshot(snapshot as any);
    
    expect(mockPrismaMethods.nodeSnapshotRecord.create).toHaveBeenCalled();
  });

  it('should batch save node snapshots', async () => {
    const snapshots = [
      { id: 'snap-1', executionId: 'exec-1', nodeId: 'N1', nodeType: 'ServiceTask', status: 'success', retryCount: 0, orderIndex: 0 },
      { id: 'snap-2', executionId: 'exec-1', nodeId: 'N2', nodeType: 'HttpTask', status: 'success', retryCount: 0, orderIndex: 1 },
    ];

    await adapter.saveNodeSnapshots(snapshots as any);
    
    expect(mockPrismaMethods.nodeSnapshotRecord.createMany).toHaveBeenCalled();
  });

  it('should append and retrieve execution events', async () => {
    const event = {
      id: 'evt-1',
      executionId: 'exec-1',
      eventType: 'NODE_STARTED',
      sequenceNumber: 1,
      createdAt: new Date(),
    };

    await adapter.appendEvent(event as any);
    
    expect(mockPrismaMethods.executionEventRecord.create).toHaveBeenCalled();
  });

  it('should manage user tasks lifecycle', async () => {
    const task = {
      id: 'task-1',
      executionId: 'exec-1',
      nodeId: 'UserTask1',
      status: 'pending',
      priority: 0,
      createdAt: new Date(),
    };

    await adapter.createUserTask(task as any);
    expect(mockPrismaMethods.userTaskRecord.create).toHaveBeenCalled();

    await adapter.assignUserTask('task-1', 'user-123');
    expect(mockPrismaMethods.userTaskRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'task-1' },
        data: expect.objectContaining({ assigneeId: 'user-123', status: 'assigned' }),
      }),
    );

    await adapter.completeUserTask('task-1', { approved: true });
    expect(mockPrismaMethods.userTaskRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'task-1' },
        data: expect.objectContaining({ status: 'completed' }),
      }),
    );

    await adapter.rejectUserTask('task-1', 'Not approved');
    expect(mockPrismaMethods.userTaskRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'task-1' },
        data: expect.objectContaining({ status: 'rejected', comment: 'Not approved' }),
      }),
    );
  });

  it('should schedule and retrieve due timers', async () => {
    const timer = {
      id: 'timer-1',
      executionId: 'exec-1',
      callbackType: 'timer',
      callbackData: { nodeId: 'TimerNode' },
      fireAt: new Date(),
      retries: 0,
      maxRetries: 3,
      status: 'pending',
      createdAt: new Date(),
    };

    await adapter.scheduleTimer(timer as any);
    expect(mockPrismaMethods.timerRecord.create).toHaveBeenCalled();

    await adapter.updateTimerStatus('timer-1', 'fired');
    expect(mockPrismaMethods.timerRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'timer-1' },
        data: { status: 'fired' },
      }),
    );
  });

  it('should list process definitions with filters', async () => {
    mockPrismaMethods.processDefinitionRecord.findMany.mockResolvedValueOnce([
      {
        id: 'def-1', key: 'test-key', name: 'Test', version: 1,
        startAt: 'Start', states: '{}', retryPolicy: null, outputMapping: null,
        description: null, timeoutSeconds: null, tenantId: 'tenant-a', createdBy: null,
      },
    ]);

    const results = await adapter.listProcessDefinitions({ tenantId: 'tenant-a' });
    
    expect(results).toHaveLength(1);
    expect(mockPrismaMethods.processDefinitionRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-a' } }),
    );
  });

  it('should list executions with status filter', async () => {
    mockPrismaMethods.workflowEngineExecution.findMany.mockResolvedValueOnce([
      {
        id: 'exec-1', processDefinitionId: 'def-1', processDefinitionKey: 'k',
        processDefinitionVersion: 1, status: 'running', input: null, output: null,
        variables: '{}', currentActivityId: null, currentRetryCount: 0,
        startedAt: new Date(), completedAt: null, failedReason: null, failedError: null,
        tenantId: null, correlationId: null,
      },
    ]);

    const results = await adapter.listExecutions({ status: 'running' });
    
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('running');
  });

  it('should destroy (disconnect) the Prisma client', async () => {
    await adapter.destroy();
    expect(mockPrismaMethods.$disconnect).toHaveBeenCalled();
  });
});
