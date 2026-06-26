// ============================================================
// WorkflowEngine — Unit Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorkflowEngine,
  ProcessDefinition,
  generateId,
} from '../src';

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;

  beforeEach(async () => {
    engine = new WorkflowEngine({ logLevel: 'error' });
    await engine.start();
  });

  describe('deployProcess', () => {
    it('should deploy a valid process definition', async () => {
      const def: ProcessDefinition = {
        id: generateId(),
        key: 'test-process',
        name: 'Test Process',
        version: 1,
        startAt: 'start',
        states: {
          start: { type: 'StartEvent', next: 'end' },
          end: { type: 'EndEvent' },
        },
      };

      const result = await engine.deployProcess(def);
      expect(result).toEqual({
        id: def.id,
        key: 'test-process',
        version: 1,
        status: 'deployed',
      });
    });

    it('should reject a process without startAt', async () => {
      const def = {
        id: generateId(),
        key: 'invalid',
        name: 'Invalid',
        version: 1,
        states: {},
      } as unknown as ProcessDefinition;

      await expect(engine.deployProcess(def)).rejects.toThrow('startAt');
    });

    it('should reject a process with unknown node reference', async () => {
      const def: ProcessDefinition = {
        id: generateId(),
        key: 'invalid-ref',
        name: 'Invalid Ref',
        version: 1,
        startAt: 'start',
        states: {
          start: { type: 'StartEvent', next: 'nonexistent' },
        },
      };

      await expect(engine.deployProcess(def)).rejects.toThrow('unknown next node');
    });
  });

  describe('startExecution', () => {
    it('should execute a simple Start → End workflow', async () => {
      const def: ProcessDefinition = {
        id: generateId(),
        key: 'simple-flow',
        name: 'Simple Flow',
        version: 1,
        startAt: 'start',
        states: {
          start: { type: 'StartEvent', next: 'end' },
          end: { type: 'EndEvent' },
        },
      };

      await engine.deployProcess(def);
      const executionId = await engine.startExecution('simple-flow', { greeting: 'hello' });

      expect(executionId).toBeDefined();

      const execution = await engine.getExecution(executionId);
      expect(execution).not.toBeNull();
      expect(execution!.status).toBe('successful');
    });

    it('should execute a workflow with ServiceTask (no URL)', async () => {
      const def: ProcessDefinition = {
        id: generateId(),
        key: 'service-flow',
        name: 'Service Flow',
        version: 1,
        startAt: 'start',
        states: {
          start: { type: 'StartEvent', next: 'service' },
          service: {
            type: 'ServiceTask',
            next: 'end',
            config: { input: { message: 'hello' } },
          },
          end: { type: 'EndEvent' },
        },
      };

      await engine.deployProcess(def);
      const executionId = await engine.startExecution('service-flow');

      expect(executionId).toBeDefined();
      const execution = await engine.getExecution(executionId);
      expect(execution!.status).toBe('successful');
    });

    it('should execute a workflow with ScriptTask', async () => {
      const def: ProcessDefinition = {
        id: generateId(),
        key: 'script-flow',
        name: 'Script Flow',
        version: 1,
        startAt: 'start',
        states: {
          start: { type: 'StartEvent', next: 'compute' },
          compute: {
            type: 'ScriptTask',
            next: 'end',
            config: {
              script: `
                const doubled = ctx.getVar('number') * 2;
                ctx.setVar('doubled', doubled);
                return doubled;
              `,
            },
          },
          end: { type: 'EndEvent' },
        },
      };

      await engine.deployProcess(def);
      const executionId = await engine.startExecution('script-flow', { number: 21 });

      expect(executionId).toBeDefined();
      const execution = await engine.getExecution(executionId);
      expect(execution!.status).toBe('successful');
      expect(execution!.variables['doubled']).toBe(42);
    });

    it('should execute a workflow with DataTransform', async () => {
      const def: ProcessDefinition = {
        id: generateId(),
        key: 'transform-flow',
        name: 'Transform Flow',
        version: 1,
        startAt: 'start',
        states: {
          start: { type: 'StartEvent', next: 'transform' },
          transform: {
            type: 'DataTransform',
            next: 'end',
            config: {
              mappings: {
                userName: 'name',
                userEmail: 'email',
              },
            },
          },
          end: { type: 'EndEvent' },
        },
      };

      await engine.deployProcess(def);
      const executionId = await engine.startExecution('transform-flow', {
        name: 'Alice',
        email: 'alice@example.com',
      });

      const execution = await engine.getExecution(executionId);
      expect(execution!.status).toBe('successful');
      expect(execution!.variables['userName']).toBe('Alice');
      expect(execution!.variables['userEmail']).toBe('alice@example.com');
    });

    it('should fail with FailState', async () => {
      const def: ProcessDefinition = {
        id: generateId(),
        key: 'fail-flow',
        name: 'Fail Flow',
        version: 1,
        startAt: 'start',
        states: {
          start: { type: 'StartEvent', next: 'fail' },
          fail: {
            type: 'FailState',
            config: { error: 'TestError', cause: 'Intentional failure' },
          },
        },
      };

      await engine.deployProcess(def);
      const executionId = await engine.startExecution('fail-flow');

      const execution = await engine.getExecution(executionId);
      expect(execution!.status).toBe('failed');
      expect(execution!.failedReason).toContain('TestError');
    });

    it('should throw when process key does not exist', async () => {
      await expect(
        engine.startExecution('nonexistent-process'),
      ).rejects.toThrow('not found');
    });
  });

  describe('ExclusiveGateway', () => {
    it('should take the matching branch', async () => {
      const def: ProcessDefinition = {
        id: generateId(),
        key: 'branch-flow',
        name: 'Branch Flow',
        version: 1,
        startAt: 'start',
        states: {
          start: { type: 'StartEvent', next: 'gateway' },
          gateway: {
            type: 'ExclusiveGateway',
            choices: [
              {
                when: { field: 'score', operator: 'gte', value: 60 },
                next: 'pass',
              },
              {
                when: { field: 'score', operator: 'lt', value: 60 },
                next: 'fail',
              },
            ],
          },
          pass: {
            type: 'ScriptTask',
            config: { script: 'ctx.setVar("result", "PASS"); return "PASS";' },
            next: 'end',
          },
          fail: {
            type: 'ScriptTask',
            config: { script: 'ctx.setVar("result", "FAIL"); return "FAIL";' },
            next: 'end',
          },
          end: { type: 'EndEvent' },
        },
      };

      await engine.deployProcess(def);

      // Test passing branch
      const execId1 = await engine.startExecution('branch-flow', { score: 85 });
      const exec1 = await engine.getExecution(execId1);
      expect(exec1!.status).toBe('successful');
      expect(exec1!.variables['result']).toBe('PASS');

      // Test failing branch
      const execId2 = await engine.startExecution('branch-flow', { score: 30 });
      const exec2 = await engine.getExecution(execId2);
      expect(exec2!.status).toBe('successful');
      expect(exec2!.variables['result']).toBe('FAIL');
    });
  });

  describe('cancelExecution', () => {
    it('should cancel an execution', async () => {
      const def: ProcessDefinition = {
        id: generateId(),
        key: 'cancel-flow',
        name: 'Cancel Flow',
        version: 1,
        startAt: 'start',
        states: {
          start: { type: 'StartEvent', next: 'end' },
          end: { type: 'EndEvent' },
        },
      };

      await engine.deployProcess(def);
      const executionId = await engine.startExecution('cancel-flow');

      // Execution completes quickly, so cancel is idempotent
      await engine.cancelExecution(executionId);

      const execution = await engine.getExecution(executionId);
      expect(execution).not.toBeNull();
    });
  });

  describe('executionGraph', () => {
    it('should return a graph for an execution', async () => {
      const def: ProcessDefinition = {
        id: generateId(),
        key: 'graph-flow',
        name: 'Graph Flow',
        version: 1,
        startAt: 'start',
        states: {
          start: { type: 'StartEvent', next: 'task' },
          task: { type: 'ServiceTask', next: 'end' },
          end: { type: 'EndEvent' },
        },
      };

      await engine.deployProcess(def);
      const executionId = await engine.startExecution('graph-flow');

      const graph = await engine.getExecutionGraph(executionId);
      expect(graph.executionId).toBe(executionId);
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);
    });
  });
});
