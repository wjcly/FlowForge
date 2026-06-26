// ============================================================
// DAGExecutor — topological sort + parallel execution engine
// ============================================================

import type {
  ProcessDefinition,
  StateNode,
  Condition,
  ExecutionContext,
  NodeExecutionResult,
  ExecutionEvent,
} from '../types';
import { evaluateJsonPath } from '../utils';

/**
 * Topological sort of the DAG. Returns nodes in execution order.
 * Detects cycles and throws if found.
 */
export function topologicalSort(
  states: Record<string, StateNode>,
): string[] {
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const result: string[] = [];

  function visit(nodeId: string): void {
    if (inStack.has(nodeId)) {
      throw new Error(`Cycle detected in workflow at node "${nodeId}"`);
    }
    if (visited.has(nodeId)) return;

    inStack.add(nodeId);
    const node = states[nodeId];

    // Follow "next" edge
    if (node?.next && states[node.next]) {
      visit(node.next);
    }

    // Follow "choices" edges (ExclusiveGateway)
    for (const choice of node?.choices ?? []) {
      if (states[choice.next]) {
        visit(choice.next);
      }
    }

    // Follow "branches" startAt edges (ParallelGateway)
    for (const branch of node?.branches ?? []) {
      if (states[branch.startAt]) {
        visit(branch.startAt);
      }
    }

    inStack.delete(nodeId);
    visited.add(nodeId);
    result.push(nodeId);
  }

  for (const nodeId of Object.keys(states)) {
    visit(nodeId);
  }

  return result.reverse();
}

/**
 * Build an adjacency list from the process definition.
 */
export function buildAdjacencyList(
  states: Record<string, StateNode>,
): Map<string, string[]> {
  const adj = new Map<string, string[]>();

  for (const [nodeId, node] of Object.entries(states)) {
    const neighbors: string[] = [];

    if (node.next) {
      neighbors.push(node.next);
    }

    for (const choice of node.choices ?? []) {
      neighbors.push(choice.next);
    }

    for (const branch of node.branches ?? []) {
      neighbors.push(branch.startAt);
    }

    adj.set(nodeId, neighbors);
  }

  return adj;
}

/**
 * Evaluate a condition against the execution context variables.
 */
export function evaluateCondition(
  condition: Condition,
  ctx: ExecutionContext,
): boolean {
  const fieldValue = evaluateJsonPath(ctx.variables, condition.field);
  const targetValue = condition.value;

  switch (condition.operator) {
    case 'eq':
      return fieldValue === targetValue;
    case 'neq':
      return fieldValue !== targetValue;
    case 'gt':
      return Number(fieldValue) > Number(targetValue);
    case 'lt':
      return Number(fieldValue) < Number(targetValue);
    case 'gte':
      return Number(fieldValue) >= Number(targetValue);
    case 'lte':
      return Number(fieldValue) <= Number(targetValue);
    case 'contains':
      return String(fieldValue).includes(String(targetValue));
    case 'startsWith':
      return String(fieldValue).startsWith(String(targetValue));
    case 'endsWith':
      return String(fieldValue).endsWith(String(targetValue));
    case 'empty':
      return fieldValue == null || fieldValue === '' || fieldValue === undefined;
    case 'notEmpty':
      return fieldValue != null && fieldValue !== '' && fieldValue !== undefined;
    case 'in':
      return Array.isArray(targetValue) && targetValue.includes(fieldValue);
    case 'notIn':
      return Array.isArray(targetValue) && !targetValue.includes(fieldValue);
    case 'regex':
      return new RegExp(String(targetValue)).test(String(fieldValue));
    default:
      return false;
  }
}

/**
 * Resolve the next node(s) from a given state, considering gateways.
 * Returns an array of next node IDs (multiple for parallel gateways).
 */
export function resolveNextNodes(
  nodeId: string,
  node: StateNode,
  ctx: ExecutionContext,
): string[] {
  const nextNodes: string[] = [];

  // ExclusiveGateway — choose first matching branch
  if (node.choices && node.choices.length > 0) {
    for (const choice of node.choices) {
      if (evaluateCondition(choice.when, ctx)) {
        nextNodes.push(choice.next);
        break; // exclusive: only one branch
      }
    }
    // No match → fall through to default "next"
    if (nextNodes.length === 0 && node.next) {
      nextNodes.push(node.next);
    }
    return nextNodes;
  }

  // ParallelGateway — all branches execute concurrently
  if (node.branches && node.branches.length > 0) {
    for (const branch of node.branches) {
      nextNodes.push(branch.startAt);
    }
    return nextNodes;
  }

  // Default linear flow
  if (node.next) {
    nextNodes.push(node.next);
  }

  return nextNodes;
}

/**
 * Check if a node's end condition is met.
 */
export function checkEndCondition(
  node: StateNode,
  ctx: ExecutionContext,
): boolean {
  if (!node.endCondition) return false;
  return evaluateCondition(node.endCondition, ctx);
}
