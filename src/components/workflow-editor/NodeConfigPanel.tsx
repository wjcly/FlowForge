// ============================================================
// Node Config Panel — right-side property editor for selected node
// ============================================================

import { useMemo, type ElementType } from 'react';
import * as LucideIcons from 'lucide-react';
import type { EditorNode } from './store';

const getIconComponent = (name: string): ElementType => {
  const IconName = name as keyof typeof LucideIcons;
  const component = LucideIcons[IconName];
  if (typeof component === 'function') return component as ElementType;
  return LucideIcons.Circle as ElementType;
};

interface Props {
  node: EditorNode | null;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

export default function NodeConfigPanel({ node, onUpdate, onClose }: Props) {
  if (!node) return null;

  const IconName = node.data.icon as keyof typeof LucideIcons;
  const IconComponent = LucideIcons[IconName] ?? LucideIcons.Circle;
  const color = node.data.color ?? '#64748b';

  // Build config fields based on node type
  const configFields = useMemo(() => {
    const fields: Array<{ key: string; label: string; type: 'text' | 'number' | 'textarea' | 'select'; options?: string[] }> = [];

    switch (node.data.nodeType) {
      case 'HttpTask':
        fields.push(
          { key: 'method', label: 'HTTP 方法', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
          { key: 'url', label: '请求 URL', type: 'text' },
          { key: 'timeoutMs', label: '超时 (ms)', type: 'number' },
          { key: 'headers', label: 'Headers (JSON)', type: 'textarea' },
          { key: 'body', label: 'Body (JSON)', type: 'textarea' },
        );
        break;
      case 'ServiceTask':
        fields.push(
          { key: 'serviceId', label: '服务 ID', type: 'text' },
          { key: 'methodName', label: '方法名', type: 'text' },
          { key: 'params', label: '参数 (JSON)', type: 'textarea' },
        );
        break;
      case 'ScriptTask':
        fields.push(
          { key: 'language', label: '语言', type: 'select', options: ['javascript', 'python'] },
          { key: 'script', label: '脚本代码', type: 'textarea' },
        );
        break;
      case 'DataTransform':
        fields.push(
          { key: 'mapping', label: '字段映射 (JSON)', type: 'textarea' },
        );
        break;
      case 'UserTask':
        fields.push(
          { key: 'assigneeId', label: '指定人 ID', type: 'text' },
          { key: 'candidateUsers', label: '候选人 (逗号分隔)', type: 'text' },
          { key: 'dueHours', label: '截止时间 (小时)', type: 'number' },
          { key: 'priority', label: '优先级', type: 'select', options: ['low', 'normal', 'high', 'urgent'] },
        );
        break;
      case 'TimerEvent':
        fields.push(
          { key: 'durationSeconds', label: '等待秒数', type: 'number' },
          { key: 'cronExpression', label: 'Cron 表达式', type: 'text' },
        );
        break;
      case 'ExclusiveGateway':
        fields.push(
          { key: 'expression', label: '条件表达式', type: 'textarea' },
        );
        break;
      case 'WaitState':
        fields.push(
          { key: 'signalName', label: '等待信号名', type: 'text' },
          { key: 'timeoutSeconds', label: '超时秒数', type: 'number' },
        );
        break;
      case 'MapState':
        fields.push(
          { key: 'iterator', label: '迭代变量', type: 'text' },
          { key: 'maxConcurrency', label: '最大并发', type: 'number' },
        );
        break;
      default:
        fields.push(
          { key: 'label', label: '显示名称', type: 'text' },
          { key: 'timeoutSeconds', label: '超时秒数', type: 'number' },
        );
    }

    return fields;
  }, [node.data.nodeType]);

  const config = node.data.config ?? {};

  return (
    <div className="flex h-full flex-col bg-white border-l border-gray-200 w-72 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ backgroundColor: `${color}15` }}
          >
            <IconComponent className="h-4 w-4" style={{ color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">{node.data.label ?? node.data.nodeType}</h3>
            <p className="text-[10px] text-gray-400 font-mono">{node.id}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">
          ×
        </button>
      </div>

      {/* Config fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {configFields.map((field) => (
          <div key={field.key}>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              {field.label}
            </label>
            {field.type === 'select' ? (
              <select
                value={(config[field.key] as string) ?? ''}
                onChange={(e) => onUpdate(node.id, { [field.key]: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-blue-400"
              >
                <option value="">— 请选择 —</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                value={(config[field.key] as string) ?? ''}
                onChange={(e) => onUpdate(node.id, { [field.key]: e.target.value })}
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs font-mono outline-none focus:border-blue-400 resize-y"
              />
            ) : (
              <input
                type={field.type}
                value={(config[field.key] as string | number) ?? ''}
                onChange={(e) => onUpdate(node.id, { [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-blue-400"
              />
            )}
          </div>
        ))}

        {/* Raw config JSON */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
            完整配置 (JSON)
          </label>
          <pre className="rounded-md bg-gray-900 text-green-400 p-3 text-[10px] font-mono overflow-x-auto">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <p className="text-[10px] text-gray-400">
          节点类型: <span className="font-mono font-bold">{node.data.nodeType}</span>
        </p>
      </div>
    </div>
  );
}
