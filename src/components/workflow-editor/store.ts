// ============================================================
// Workflow Editor Store — Zustand state for react-flow canvas
// ============================================================

import { create } from 'zustand';
import type { Node, Edge, Connection } from 'reactflow';
import type { NodeType, StateNode, ProcessDefinition } from '../../packages/workflow-engine/src/types';

// ─── Palette node definitions ──────────────────────────────────

export interface PaletteNodeDef {
  type: NodeType;
  label: string;
  category: NodeCategory;
  icon: string;          // lucide-react icon name
  color: string;
  description: string;
  defaultConfig?: Record<string, unknown>;
}

export type NodeCategory = 'event' | 'task' | 'gateway' | 'control';

export const NODE_PALETTE: PaletteNodeDef[] = [
  // ── Events ───────────────────────────────────────
  { type: 'StartEvent', label: '开始事件', category: 'event', icon: 'Play', color: '#22c55e', description: '流程入口' },
  { type: 'EndEvent', label: '结束事件', category: 'event', icon: 'CircleStop', color: '#ef4444', description: '流程出口' },
  { type: 'TimerEvent', label: '定时器事件', category: 'event', icon: 'Clock', color: '#f59e0b', description: '定时触发' },
  { type: 'MessageEvent', label: '消息事件', category: 'event', icon: 'Mail', color: '#3b82f6', description: '等待外部消息' },
  { type: 'SignalEvent', label: '信号事件', category: 'event', icon: 'Radio', color: '#8b5cf6', description: '广播信号' },

  // ── Tasks ────────────────────────────────────────
  { type: 'ServiceTask', label: '服务任务', category: 'task', icon: 'Settings', color: '#0ea5e9', description: '调用后端服务' },
  { type: 'HttpTask', label: 'HTTP 请求', category: 'task', icon: 'Globe', color: '#06b6d4', description: '发送 HTTP 请求' },
  { type: 'ScriptTask', label: '脚本任务', category: 'task', icon: 'Code', color: '#10b981', description: '执行 JavaScript' },
  { type: 'DataTransform', label: '数据转换', category: 'task', icon: 'ArrowRightLeft', color: '#6366f1', description: '转换/映射数据' },
  { type: 'UserTask', label: '用户任务', category: 'task', icon: 'User', color: '#ec4899', description: '人工审批/填写' },

  // ── Gateways ─────────────────────────────────────
  { type: 'ExclusiveGateway', label: '排他网关', category: 'gateway', icon: 'GitBranch', color: '#f97316', description: '二选一分支' },
  { type: 'ParallelGateway', label: '并行网关', category: 'gateway', icon: 'Split', color: '#eab308', description: '多路并行' },
  { type: 'InclusiveGateway', label: '包容网关', category: 'gateway', icon: 'GitMerge', color: '#d946ef', description: '条件并行' },

  // ── Control ──────────────────────────────────────
  { type: 'WaitState', label: '等待状态', category: 'control', icon: 'Pause', color: '#64748b', description: '暂停等待信号' },
  { type: 'MapState', label: '映射循环', category: 'control', icon: 'List', color: '#14b8a6', description: '遍历集合执行' },
  { type: 'FailState', label: '失败状态', category: 'control', icon: 'XCircle', color: '#dc2626', description: '抛出失败' },
  { type: 'SucceedState', label: '成功终止', category: 'control', icon: 'CheckCircle', color: '#16a34a', description: '成功结束' },
];

// ─── Editor Node (extends react-flow Node) ─────────────────────

export interface EditorNodeData {
  nodeType?: NodeType;
  label?: string;
  config?: Record<string, unknown>;
  color?: string;
  icon?: string;
}

export type EditorNode = Node<EditorNodeData>;

// ─── Store ─────────────────────────────────────────────────────

export interface WorkflowEditorState {
  // Canvas state
  nodes: EditorNode[];
  edges: Edge[];

  // Selection
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // UI
  showConfigPanel: boolean;
  showPalette: boolean;
  zoomLevel: number;

  // Process definition (for export)
  processKey: string;
  processName: string;

  // Actions
  addNode: (node: EditorNode) => void;
  updateNode: (id: string, data: Partial<EditorNodeData>) => void;
  removeNode: (id: string) => void;
  setNodes: (nodes: EditorNode[]) => void;

  addEdge: (edge: Edge) => void;
  removeEdge: (id: string) => void;
  onConnect: (connection: Connection) => void;
  setEdges: (edges: Edge[]) => void;

  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;

  toggleConfigPanel: () => void;
  togglePalette: () => void;
  setZoomLevel: (zoom: number) => void;

  setProcessKey: (key: string) => void;
  setProcessName: (name: string) => void;

  // Export / Import
  exportToProcessDefinition: () => ProcessDefinition;
  importFromProcessDefinition: (def: ProcessDefinition) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const createEditorNode = (type: NodeType, position: { x: number; y: number }): EditorNode => {
  const paletteItem = NODE_PALETTE.find((n) => n.type === type);
  return {
    id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'customWorkflowNode',  // react-flow custom node type
    position,
    data: {
      nodeType: type,
      label: paletteItem?.label ?? type,
      config: paletteItem?.defaultConfig ?? {},
      color: paletteItem?.color ?? '#64748b',
      icon: paletteItem?.icon ?? 'Circle',
    },
  };
};

export const useWorkflowStore = create<WorkflowEditorState>((set, get) => ({
  // ─── Initial State ──────────────────────────────
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  showConfigPanel: false,
  showPalette: true,
  zoomLevel: 1,
  processKey: 'my-workflow',
  processName: 'My Workflow',

  // ─── Node Actions ───────────────────────────────
  addNode: (node) => {
    const history = getHistory(get());
    set((s) => ({
      nodes: [...s.nodes, node],
      _history: [...history.history, { nodes: [...s.nodes, node], edges: s.edges }],
      _historyIndex: history.historyIndex + 1,
    }));
  },

  updateNode: (id, data) => {
    const history = getHistory(get());
    set((s) => {
      const nodes = s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
      );
      return {
        nodes,
        _history: [...history.history.slice(0, history.historyIndex + 1), { nodes, edges: s.edges }],
        _historyIndex: history.historyIndex + 1,
      };
    });
  },

  removeNode: (id) => {
    const history = getHistory(get());
    set((s) => {
      const nodes = s.nodes.filter((n) => n.id !== id);
      const edges = s.edges.filter((e) => e.source !== id && e.target !== id);
      return {
        nodes,
        edges,
        selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
        _history: [...history.history.slice(0, history.historyIndex + 1), { nodes, edges }],
        _historyIndex: history.historyIndex + 1,
      };
    });
  },

  setNodes: (nodes) => set({ nodes }),

  // ─── Edge Actions ───────────────────────────────
  addEdge: (edge) => {
    const history = getHistory(get());
    set((s) => ({
      edges: [...s.edges, edge],
      _history: [...history.history.slice(0, history.historyIndex + 1), { nodes: s.nodes, edges: [...s.edges, edge] }],
      _historyIndex: history.historyIndex + 1,
    }));
  },

  removeEdge: (id) => {
    const history = getHistory(get());
    set((s) => {
      const edges = s.edges.filter((e) => e.id !== id);
      return {
        edges,
        selectedEdgeId: s.selectedEdgeId === id ? null : s.selectedEdgeId,
        _history: [...history.history.slice(0, history.historyIndex + 1), { nodes: s.nodes, edges }],
        _historyIndex: history.historyIndex + 1,
      };
    });
  },

  onConnect: (connection) => {
    const edgeId = `${connection.source}-${connection.target}`;
    // Prevent self-loops and duplicate edges
    const exists = get().edges.some(
      (e) => e.source === connection.source && e.target === connection.target,
    );
    if (exists || connection.source === connection.target) return;

    get().addEdge({
      id: edgeId,
      source: connection.source,
      target: connection.target,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#94a3b8' },
    });
  },

  setEdges: (edges) => set({ edges }),

  // ─── Selection ──────────────────────────────────
  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  // ─── UI ─────────────────────────────────────────
  toggleConfigPanel: () => set((s) => ({ showConfigPanel: !s.showConfigPanel })),
  togglePalette: () => set((s) => ({ showPalette: !s.showPalette })),
  setZoomLevel: (zoom) => set({ zoomLevel: zoom }),

  // ─── Process Metadata ───────────────────────────
  setProcessKey: (key) => set({ processKey: key }),
  setProcessName: (name) => set({ processName: name }),

  // ─── Export / Import ────────────────────────────
  exportToProcessDefinition: () => {
    const { nodes, edges, processKey, processName } = get();

    // Build states map from nodes
    const states: Record<string, StateNode> = {};
    let startAt = '';

    for (const node of nodes) {
      const nodeId = node.id.replace(/^node-/, '');
      const data = node.data;
      const stateNode: StateNode = {
        type: data.nodeType ?? 'ServiceTask',
        config: data.config,
      };

      // Resolve next from edges
      const outgoingEdges = edges.filter((e) => e.source === node.id);
      if (outgoingEdges.length === 1) {
        stateNode.next = outgoingEdges[0].target.replace(/^node-/, '');
      } else if (outgoingEdges.length > 1) {
        // Gateway: build choices
        stateNode.choices = outgoingEdges.map((e, i) => ({
          when: { field: `$_branch_${i}`, operator: 'eq' as const, value: true },
          next: e.target.replace(/^node-/, ''),
        }));
      }

      if (data.nodeType === 'StartEvent') {
        startAt = nodeId;
      }

      states[nodeId] = stateNode;
    }

    return {
      id: `proc-${Date.now()}`,
      key: processKey,
      name: processName,
      version: 1,
      startAt,
      states,
      createdAt: new Date().toISOString(),
    };
  },

  importFromProcessDefinition: (def) => {
    const nodes: EditorNode[] = [];
    const edges: Edge[] = [];
    let x = 100;
    const rowHeight = 120;
    let y = 100;

    for (const [nodeId, stateNode] of Object.entries(def.states)) {
      const paletteItem = NODE_PALETTE.find((n) => n.type === stateNode.type);
      nodes.push({
        id: `node-${nodeId}`,
        type: 'customWorkflowNode',
        position: { x, y },
        data: {
          nodeType: stateNode.type,
          label: paletteItem?.label ?? nodeId,
          config: stateNode.config ?? {},
          color: paletteItem?.color ?? '#64748b',
          icon: paletteItem?.icon ?? 'Circle',
        },
      });

      if (stateNode.next) {
        edges.push({
          id: `node-${nodeId}-node-${stateNode.next}`,
          source: `node-${nodeId}`,
          target: `node-${stateNode.next}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#94a3b8' },
        });
      }

      if (stateNode.choices) {
        for (const choice of stateNode.choices) {
          edges.push({
            id: `node-${nodeId}-node-${choice.next}`,
            source: `node-${nodeId}`,
            target: `node-${choice.next}`,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#94a3b8' },
          });
        }
      }

      x += 250;
      if (x > 1200) {
        x = 100;
        y += rowHeight;
      }
    }

    set({ nodes, edges, processKey: def.key, processName: def.name });
  },

  // ─── Undo/Redo (stub — stored in extended state) ──
  undo: () => {},
  redo: () => {},
  canUndo: false,
  canRedo: false,

  // ─── Internal history (not part of public API) ──
  _history: [{ nodes: [], edges: [] }] as { nodes: EditorNode[]; edges: Edge[] }[],
  _historyIndex: 0,
}));

// Helper to access internal history state
function getHistory(s: ReturnType<typeof useWorkflowStore>) {
  return {
    history: (s as unknown as { _history: unknown[] })._history as { nodes: EditorNode[]; edges: Edge[] }[],
    historyIndex: (s as unknown as { _historyIndex: number })._historyIndex,
  };
}

// ─── Utility: create node from palette ─────────────────────────

export function createNodeFromPalette(type: NodeType, position: { x: number; y: number }) {
  return createEditorNode(type, position);
}
