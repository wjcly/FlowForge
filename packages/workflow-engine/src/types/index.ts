// ============================================================
// @formcraft/workflow-engine — Core Type Definitions
// ============================================================

// ─── Node Types (BPMN 2.0 aligned) ──────────────────────────

export type NodeType =
  // Task nodes
  | 'ServiceTask'
  | 'UserTask'
  | 'HttpTask'
  | 'ScriptTask'
  | 'DataTransform'
  // Gateway nodes
  | 'ExclusiveGateway'
  | 'ParallelGateway'
  | 'InclusiveGateway'
  // Event nodes
  | 'StartEvent'
  | 'EndEvent'
  | 'TimerEvent'
  | 'MessageEvent'
  | 'SignalEvent'
  // Control nodes
  | 'WaitState'
  | 'MapState'
  | 'FailState'
  | 'SucceedState'
  // Sub-process
  | 'SubProcess'
  | 'CallActivity';

export type NodeCategory = 'task' | 'gateway' | 'event' | 'control';

// ─── Execution Status (fine-grained state machine) ──────────

export type ExecutionStatus =
  | 'pending'
  | 'scheduled'
  | 'running'
  | 'waiting'      // waiting for external signal / user task / timer
  | 'successful'
  | 'failed'
  | 'cancelled'
  | 'terminated';

export type NodeExecutionStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'timed_out';

// ─── Condition / Expression ─────────────────────────────────

export type ConditionOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'empty'
  | 'notEmpty'
  | 'in'
  | 'notIn'
  | 'regex';

export interface Condition {
  field: string;           // JSONPath expression
  operator: ConditionOperator;
  value: unknown;
}

// ─── Retry Policy ───────────────────────────────────────────

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffRate: number;     // exponential backoff multiplier
  retryableErrors?: string[];
}

// ─── Error Handler ──────────────────────────────────────────

export interface ErrorHandler {
  errorTypes?: string[];   // which errors to catch
  next?: string;           // fallback node on error
  retryPolicy?: RetryPolicy;
}

// ─── State Node Definition (ASL style) ──────────────────────

export interface Choice {
  var?: string;            // JSONPath for condition evaluation
  when: Condition;
  next: string;
}

export interface Branch {
  name?: string;
  startAt: string;
  endCondition?: Condition;
  iterator?: string;       // for MapState branches
}

export interface StateNode {
  type: NodeType;

  // Flow control
  next?: string;
  endCondition?: Condition;

  // Gateways
  choices?: Choice[];           // ExclusiveGateway
  branches?: Branch[];          // ParallelGateway / InclusiveGateway

  // Sub-process
  subFlowId?: string;
  states?: Record<string, StateNode>;  // nested for SubProcess

  // Error handling
  catch?: ErrorHandler[];

  // Compensation (Saga)
  compensate?: string;

  // Timeout
  timeoutSeconds?: number;

  // Node-specific configuration
  config?: Record<string, unknown>;
}

// ─── Process Definition ─────────────────────────────────────

export interface OutputMapping {
  includeExecutionId?: boolean;
  includeStartTime?: boolean;
  includeEndTime?: boolean;
  mappings?: Record<string, string>;  // outputKey -> JSONPath
}

export interface ProcessDefinition {
  id: string;
  key: string;               // business key, e.g. "order-approval"
  name: string;
  version: number;
  description?: string;

  startAt: string;           // entry node reference

  // Global config
  timeoutSeconds?: number;
  retryPolicy?: RetryPolicy;

  states: Record<string, StateNode>;

  output?: OutputMapping;

  // Metadata
  tenantId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeployResult {
  id: string;
  key: string;
  version: number;
  status: 'deployed' | 'replaced';
}

// ─── Workflow Execution ─────────────────────────────────────

export interface StartOptions {
  variables?: Record<string, unknown>;
  correlationId?: string;
  tenantId?: string;
  overrideVariables?: Record<string, unknown>;
}

export interface WorkflowExecution {
  id: string;
  processDefinitionId: string;
  processDefinitionKey: string;
  processDefinitionVersion: number;

  status: ExecutionStatus;

  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  variables: Record<string, unknown>;

  currentActivityId?: string;
  currentRetryCount: number;

  startedAt: Date;
  completedAt?: Date;
  failedReason?: string;
  failedError?: string;

  // Multi-tenant & correlation
  tenantId?: string;
  correlationId?: string;
}

// ─── Node Snapshot ──────────────────────────────────────────

export interface NodeSnapshot {
  id: string;
  executionId: string;

  nodeId: string;
  nodeName?: string;
  nodeType: NodeType;

  status: NodeExecutionStatus;

  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  retryCount: number;

  startedAt?: Date;
  completedAt?: Date;

  orderIndex: number;
}

// ─── Execution Event (Event Sourcing) ───────────────────────

export type ExecutionEventType =
  | 'EXECUTION_STARTED'
  | 'EXECUTION_COMPLETED'
  | 'EXECUTION_FAILED'
  | 'EXECUTION_CANCELLED'
  | 'NODE_STARTED'
  | 'NODE_COMPLETED'
  | 'NODE_FAILED'
  | 'NODE_SKIPPED'
  | 'STATUS_CHANGED'
  | 'SIGNAL_RECEIVED'
  | 'TIMER_FIRED'
  | 'RETRY_ATTEMPTED'
  | 'VARIABLE_UPDATED';

export interface ExecutionEvent {
  id: string;
  executionId: string;
  eventType: ExecutionEventType;
  nodeId?: string;
  payload?: Record<string, unknown>;
  sequenceNumber: number;
  createdAt: Date;
}

// ─── Execution Context (shared across nodes) ────────────────

export interface ExecutionContext {
  executionId: string;
  processDefinition: ProcessDefinition;

  // Mutable runtime variables
  variables: Record<string, unknown>;

  // Input to this execution
  input: Record<string, unknown>;

  // Collected output from completed nodes
  results: Record<string, unknown>;

  // Metadata
  correlationId?: string;
  tenantId?: string;

  // Utility methods
  getVar(path: string): unknown;
  setVar(key: string, value: unknown): void;
  emitEvent(type: ExecutionEventType, payload?: Record<string, unknown>): void;
}

// ─── Node Execution Result ──────────────────────────────────

export interface NodeExecutionResult {
  nodeId: string;
  status: NodeExecutionStatus;
  output?: Record<string, unknown>;
  error?: string;
  nextNodeId?: string;       // resolved next node
  skipped?: boolean;
}

// ─── User Task ──────────────────────────────────────────────

export type UserTaskStatus =
  | 'pending'
  | 'assigned'
  | 'claimed'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'delegated'
  | 'timed_out';

export interface UserTaskInstance {
  id: string;
  executionId: string;
  nodeId: string;

  assigneeId?: string;
  candidateUsers?: string[];
  candidateGroups?: string[];

  status: UserTaskStatus;

  formDefinition?: Record<string, unknown>;
  formResult?: Record<string, unknown>;
  comment?: string;

  priority: number;
  dueDate?: Date;
  slaDeadline?: Date;

  createdBy?: string;
  completedBy?: string;
  completedAt?: Date;
  createdAt: Date;
}

// ─── Timer Entry ────────────────────────────────────────────

export type TimerCallbackType = 'timer' | 'retry' | 'scheduled_trigger';

export interface TimerEntry {
  id: string;
  executionId?: string;
  callbackType: TimerCallbackType;
  callbackData: Record<string, unknown>;

  fireAt: Date;
  retries: number;
  maxRetries: number;

  status: 'pending' | 'fired' | 'failed';
  createdAt: Date;
}

// ─── Signal / Message Events ────────────────────────────────

export interface SignalEvent {
  signalName: string;
  data?: Record<string, unknown>;
}

export interface MessageEvent {
  messageName: string;
  correlationKey?: string;
  payload?: Record<string, unknown>;
}

// ─── Engine Config ──────────────────────────────────────────

export interface EngineConfig {
  // Persistence adapter
  persistence?: 'memory' | 'prisma';

  // Concurrency
  maxConcurrency?: number;

  // Global retry policy
  defaultRetryPolicy?: Partial<RetryPolicy>;

  // Global timeout
  defaultTimeoutSeconds?: number;

  // Enable/disable features
  enableSagas?: boolean;
  enableTimers?: boolean;
  enableEventSourcing?: boolean;

  // Logging
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// ─── Execution Graph (for visualization) ────────────────────

export interface GraphNode {
  id: string;
  name?: string;
  type: NodeType;
  status?: NodeExecutionStatus;
  position?: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  taken?: boolean;
}

export interface ExecutionGraph {
  executionId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
