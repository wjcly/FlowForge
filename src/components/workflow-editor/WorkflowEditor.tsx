// ============================================================
// WorkflowEditor — Main react-flow canvas with drag-drop, toolbar, minimap
// ============================================================

'use client';

import { useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  Panel,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useWorkflowStore, createNodeFromPalette, type EditorNode } from './store';
import CustomWorkflowNode from './CustomWorkflowNode';
import NodeConfigPanel from './NodeConfigPanel';
import NodePalette from './NodePalette';
import * as LucideIcons from 'lucide-react';

const nodeTypes = {
  customWorkflowNode: CustomWorkflowNode,
};

export default function WorkflowEditor() {
  const storeNodes = useWorkflowStore((s) => s.nodes);
  const storeEdges = useWorkflowStore((s) => s.edges);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const showConfigPanel = useWorkflowStore((s) => s.showConfigPanel);
  const showPalette = useWorkflowStore((s) => s.showPalette);

  const setStoreNodes = useWorkflowStore((s) => s.setNodes);
  const setStoreEdges = useWorkflowStore((s) => s.setEdges);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const onConnect = useWorkflowStore((s) => s.onConnect);
  const toggleConfigPanel = useWorkflowStore((s) => s.toggleConfigPanel);
  const togglePalette = useWorkflowStore((s) => s.togglePalette);
  const exportToProcessDefinition = useWorkflowStore((s) => s.exportToProcessDefinition);

  const [nodes, setNodes, onNodesChangeIntern] = useNodesState(storeNodes as any);
  const [edges, setEdges, onEdgesChangeIntern] = useEdgesState(storeEdges as any);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Sync store → local state when store changes from outside (import)
  const prevNodeCount = useRef(0);
  if (storeNodes.length !== prevNodeCount.current) {
    setNodes(storeNodes as any);
    prevNodeCount.current = storeNodes.length;
  }

  // ─── DnD Drop Handler ──────────────────────────────────────
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = JSON.parse(event.dataTransfer.getData('application/json')).nodeType;
      if (!nodeType) return;

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const position = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };

      const newNode = createNodeFromPalette(nodeType as any, position);
      setNodes((nds) => [...nds, newNode]);
      setStoreNodes([...storeNodes, newNode]);
    },
    [storeNodes, setStoreNodes],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // ─── React Flow Handlers ───────────────────────────────────
  const onConnectInternal: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => addEdge(connection, eds));
      onConnect(connection);
    },
    [onConnect],
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChangeIntern(changes);
      // Sync back to store
      setStoreNodes(nodes as EditorNode[]);
    },
    [nodes, setStoreNodes],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChangeIntern(changes);
      setStoreEdges(edges);
    },
    [edges, setStoreEdges],
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: any) => {
    selectNode(node.id);
    toggleConfigPanel();
  }, [selectNode, toggleConfigPanel]);

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // ─── Selected Node ─────────────────────────────────────────
  const selectedNode = storeNodes.find((n) => n.id === selectedNodeId) ?? null;

  // ─── Toolbar Actions ───────────────────────────────────────
  const handleExport = () => {
    const def = exportToProcessDefinition();
    console.log('Exported Process Definition:', JSON.stringify(def, null, 2));
    alert('流程定义已导出到控制台 (F12)');
  };

  const handleClear = () => {
    if (confirm('确定清空画布？')) {
      setNodes([]);
      setEdges([]);
      setStoreNodes([]);
      setStoreEdges([]);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left: Node Palette */}
      {showPalette && (
        <div className="w-64 shrink-0">
          <NodePalette />
        </div>
      )}

      {/* Center: Canvas */}
      <div className="flex-1 flex flex-col" ref={reactFlowWrapper}>
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePalette}
              className={`rounded-md p-1.5 text-xs transition-colors ${
                showPalette ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="节点面板"
            >
              <LucideIcons.LayoutPanelLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-gray-700">工作流编辑器</span>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
              {storeNodes.length} 节点 · {storeEdges.length} 连线
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={handleExport} className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition-colors">
              <LucideIcons.Download className="mr-1 inline h-3 w-3" />
              导出 JSON
            </button>
            <button onClick={handleClear} className="rounded-md px-2 py-1.5 text-xs text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
              <LucideIcons.Trash2 className="mr-1 inline h-3 w-3" />
              清空
            </button>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnectInternal}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#94a3b8', strokeWidth: 2 },
            }}
            connectionLineStyle={{ stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5 5' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls className="!rounded-lg !border !border-gray-200 !bg-white !shadow-sm" />
            <MiniMap
              nodeStrokeColor="#cbd5e1"
              nodeColor="#94a3b8"
              maskColor="rgba(248, 250, 252, 0.8)"
              className="!rounded-lg !border !border-gray-200 !bg-white/80"
            />
            <Panel position="top-left" className="pointer-events-none">
              <div className="rounded-md bg-white/90 px-3 py-1.5 text-[10px] text-gray-400 shadow-sm backdrop-blur">
                从左侧面板拖拽节点到画布 · 点击节点编辑配置 · 拖拽输出端连线
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* Right: Config Panel */}
      {showConfigPanel && selectedNode && (
        <div className="w-72 shrink-0 shadow-xl">
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={(id, data) => updateNode(id, data)}
            onClose={toggleConfigPanel}
          />
        </div>
      )}
    </div>
  );
}
