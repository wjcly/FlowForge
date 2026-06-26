// ============================================================
// Custom Workflow Node — react-flow custom node component
// ============================================================

import { memo, type ElementType } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import * as LucideIcons from 'lucide-react';
import type { EditorNodeData } from './store';

const getIconComponent = (name: string): ElementType => {
  const IconName = name as keyof typeof LucideIcons;
  const component = LucideIcons[IconName];
  if (typeof component === 'function') return component as ElementType;
  return LucideIcons.Circle as ElementType;
};

const CustomWorkflowNode = ({ data, selected }: NodeProps<EditorNodeData>) => {
  const IconComponent = getIconComponent(data.icon ?? 'Circle');
  const color = data.color ?? '#64748b';

  return (
    <div
      className={`
        relative rounded-xl border-2 px-4 py-3 shadow-sm transition-all min-w-[140px]
        ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
        bg-white
      `}
      style={{ borderColor: color }}
    >
      {/* Input handle — hidden for StartEvent */}
      {data.nodeType !== 'StartEvent' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white hover:!bg-blue-500"
        />
      )}

      <div className="flex flex-col items-center gap-1.5">
        {/* Icon */}
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <IconComponent className="h-5 w-5" style={{ color }} />
        </div>

        {/* Label */}
        <span className="text-xs font-semibold text-gray-800 text-center leading-tight">
          {data.label ?? data.nodeType}
        </span>

        {/* Type badge */}
        <span
          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {data.nodeType}
        </span>
      </div>

      {/* Output handle — hidden for EndEvent / FailState / SucceedState */}
      {!['EndEvent', 'FailState', 'SucceedState'].includes(data.nodeType ?? '') && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white hover:!bg-blue-500"
        />
      )}

      {/* Delete button on hover */}
      {selected && (
        <button
          className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs hover:bg-red-600"
          onClick={(e) => {
            e.stopPropagation();
            // Dispatch a custom event for deletion (handled by parent)
            window.dispatchEvent(new CustomEvent('workflow-node-delete', {
              detail: { nodeId: (data as any).__nodeId },
            }));
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};

export default memo(CustomWorkflowNode);
