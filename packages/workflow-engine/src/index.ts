// ============================================================
// @formcraft/workflow-engine — Public API
// ============================================================

// Core types
export type {
  // Node types
  NodeType,
  NodeCategory,
  // Execution status
  ExecutionStatus,
  NodeExecutionStatus,
  // Conditions & expressions
  ConditionOperator,
  Condition,
  // Retry & error handling
  RetryPolicy,
  ErrorHandler,
  // State nodes
  Choice,
  Branch,
  StateNode,
  // Process definition
  OutputMapping,
  ProcessDefinition,
  DeployResult,
  // Execution
  StartOptions,
  WorkflowExecution,
  NodeSnapshot,
  // Events
  ExecutionEventType,
  ExecutionEvent,
  // Context & results
  ExecutionContext,
  NodeExecutionResult,
  // User tasks
  UserTaskStatus,
  UserTaskInstance,
  // Timers
  TimerCallbackType,
  TimerEntry,
  // Signals & messages
  SignalEvent,
  MessageEvent,
  // Engine config
  EngineConfig,
  // Graph visualization
  GraphNode,
  GraphEdge,
  ExecutionGraph,
} from './types';

// Engine core
export { EventBus } from './engine/EventBus';
export { StateMachine } from './engine/StateMachine';
export { WorkflowEngine } from './engine/WorkflowEngine';
export {
  topologicalSort,
  buildAdjacencyList,
  evaluateCondition,
  resolveNextNodes,
  checkEndCondition,
} from './engine/DAGExecutor';

// Node system
export { NodeRegistry } from './nodes/NodeRegistry';
export { BaseNode } from './nodes/base/BaseNode';
export { ExecutionContext as ExecutionCtx } from './nodes/base/ExecutionContext';

// Built-in nodes
export { HttpTaskNode } from './nodes/builtin/HttpTaskNode';
export { ServiceTaskNode } from './nodes/builtin/ServiceTaskNode';
export { ScriptTaskNode } from './nodes/builtin/ScriptTaskNode';
export { UserTaskNode } from './nodes/builtin/UserTaskNode';
export { DataTransformNode } from './nodes/builtin/DataTransformNode';
export { ExclusiveGatewayNode } from './nodes/builtin/ExclusiveGatewayNode';
export { ParallelGatewayNode } from './nodes/builtin/ParallelGatewayNode';
export { InclusiveGatewayNode } from './nodes/builtin/InclusiveGatewayNode';
export { StartEventNode } from './nodes/builtin/StartEventNode';
export { EndEventNode } from './nodes/builtin/EndEventNode';
export { TimerEventNode } from './nodes/builtin/TimerEventNode';
export { MessageEventNode } from './nodes/builtin/MessageEventNode';
export { SignalEventNode } from './nodes/builtin/SignalEventNode';
export { WaitStateNode } from './nodes/builtin/WaitStateNode';
export { MapStateNode } from './nodes/builtin/MapStateNode';
export { FailStateNode } from './nodes/builtin/FailStateNode';
export { SucceedStateNode } from './nodes/builtin/SucceedStateNode';
export { SubProcessNode } from './nodes/builtin/SubProcessNode';
export { CallActivityNode } from './nodes/builtin/CallActivityNode';
export { registerAllBuiltinNodes } from './nodes/builtin/register';

// Persistence
export { PersistenceAdapter } from './persistence/PersistenceAdapter';
export { InMemoryAdapter } from './persistence/InMemoryAdapter';

// Utilities
export {
  evaluateJsonPath,
  setJsonPath,
  generateId,
  deepClone,
  sleep,
} from './utils';
