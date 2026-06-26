import { describe, it, expect } from 'vitest';
import { topologicalSort, buildAdjacencyList, evaluateCondition, resolveNextNodes } from '../src/engine/DAGExecutor';
import type { StateNode, ExecutionContext } from '../src/types';

describe('DAGExecutor', () => {
  describe('topologicalSort', () => {
    it('should sort a linear DAG correctly', () => {
      const states: Record<string, StateNode> = {
        A: { type: 'StartEvent', next: 'B' },
        B: { type: 'ServiceTask', next: 'C' },
        C: { type: 'EndEvent' },
      };

      const result = topologicalSort(states);
      expect(result).toEqual(['A', 'B', 'C']); // topological order (sources first)
    });

    it('should sort a branched DAG correctly', () => {
      const states: Record<string, StateNode> = {
        A: { type: 'StartEvent', next: 'gateway' },
        gateway: {
          type: 'ExclusiveGateway',
          choices: [
            { when: { field: 'x', operator: 'eq', value: 1 }, next: 'B' },
            { when: { field: 'x', operator: 'eq', value: 2 }, next: 'C' },
          ],
        },
        B: { type: 'ServiceTask', next: 'D' },
        C: { type: 'ServiceTask', next: 'D' },
        D: { type: 'EndEvent' },
      };

      const result = topologicalSort(states);
      expect(result).toContain('A');
      expect(result).toContain('D');
    });

    it('should detect cycles', () => {
      const states: Record<string, StateNode> = {
        A: { type: 'ServiceTask', next: 'B' },
        B: { type: 'ServiceTask', next: 'A' },
      };

      expect(() => topologicalSort(states)).toThrow('Cycle detected');
    });
  });

  describe('buildAdjacencyList', () => {
    it('should build correct adjacency list', () => {
      const states: Record<string, StateNode> = {
        A: { type: 'StartEvent', next: 'B' },
        B: { type: 'ServiceTask', next: 'C' },
        C: { type: 'EndEvent' },
      };

      const adj = buildAdjacencyList(states);
      expect(adj.get('A')).toEqual(['B']);
      expect(adj.get('B')).toEqual(['C']);
      expect(adj.get('C')).toEqual([]);
    });
  });

  describe('evaluateCondition', () => {
    const mockCtx: Partial<ExecutionContext> = {
      variables: { score: 85, name: 'Alice', tags: ['admin', 'user'] },
    } as ExecutionContext;

    it('should evaluate eq', () => {
      expect(
        evaluateCondition({ field: 'name', operator: 'eq', value: 'Alice' }, mockCtx),
      ).toBe(true);
    });

    it('should evaluate gte', () => {
      expect(
        evaluateCondition({ field: 'score', operator: 'gte', value: 80 }, mockCtx),
      ).toBe(true);
    });

    it('should evaluate lt', () => {
      expect(
        evaluateCondition({ field: 'score', operator: 'lt', value: 80 }, mockCtx),
      ).toBe(false);
    });

    it('should evaluate empty', () => {
      const ctx = { variables: { emptyField: '' } } as ExecutionContext;
      expect(
        evaluateCondition({ field: 'emptyField', operator: 'empty', value: null }, ctx),
      ).toBe(true);
    });
  });

  describe('resolveNextNodes', () => {
    it('should resolve linear next', () => {
      const node: StateNode = { type: 'ServiceTask', next: 'B' };
      const result = resolveNextNodes('A', node, {} as ExecutionContext);
      expect(result).toEqual(['B']);
    });

    it('should resolve exclusive gateway choice', () => {
      const node: StateNode = {
        type: 'ExclusiveGateway',
        choices: [
          { when: { field: 'score', operator: 'gte', value: 60 }, next: 'pass' },
          { when: { field: 'score', operator: 'lt', value: 60 }, next: 'fail' },
        ],
      };

      const ctx = { variables: { score: 85 } } as ExecutionContext;
      expect(resolveNextNodes('gw', node, ctx)).toEqual(['pass']);

      const ctx2 = { variables: { score: 30 } } as ExecutionContext;
      expect(resolveNextNodes('gw', node, ctx2)).toEqual(['fail']);
    });

    it('should resolve parallel gateway branches', () => {
      const node: StateNode = {
        type: 'ParallelGateway',
        branches: [
          { startAt: 'branch1' },
          { startAt: 'branch2' },
        ],
      };

      const result = resolveNextNodes('gw', node, {} as ExecutionContext);
      expect(result).toEqual(['branch1', 'branch2']);
    });
  });
});
