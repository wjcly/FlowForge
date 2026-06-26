// ============================================================
// Register all built-in nodes into the NodeRegistry
// ============================================================

import type { NodeRegistry } from '../NodeRegistry';
import {
  HttpTaskNode,
  ServiceTaskNode,
  ScriptTaskNode,
  UserTaskNode,
  DataTransformNode,
  ExclusiveGatewayNode,
  ParallelGatewayNode,
  InclusiveGatewayNode,
  StartEventNode,
  EndEventNode,
  TimerEventNode,
  MessageEventNode,
  SignalEventNode,
  WaitStateNode,
  MapStateNode,
  FailStateNode,
  SucceedStateNode,
  SubProcessNode,
  CallActivityNode,
} from '.';

const BUILTIN_NODES = [
  HttpTaskNode,
  ServiceTaskNode,
  ScriptTaskNode,
  UserTaskNode,
  DataTransformNode,
  ExclusiveGatewayNode,
  ParallelGatewayNode,
  InclusiveGatewayNode,
  StartEventNode,
  EndEventNode,
  TimerEventNode,
  MessageEventNode,
  SignalEventNode,
  WaitStateNode,
  MapStateNode,
  FailStateNode,
  SucceedStateNode,
  SubProcessNode,
  CallActivityNode,
];

export function registerAllBuiltinNodes(registry: NodeRegistry): void {
  for (const NodeClass of BUILTIN_NODES) {
    const instance = new NodeClass();
    registry.register(instance);
  }
}
