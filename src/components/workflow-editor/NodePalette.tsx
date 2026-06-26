// ============================================================
// Node Palette — draggable node types sidebar (HTML5 DnD)
// ============================================================

import { useState, type ElementType } from 'react';
import * as LucideIcons from 'lucide-react';
import { NODE_PALETTE, type PaletteNodeDef, type NodeCategory } from './store';

const getIconComponent = (name: string): ElementType => {
  const IconName = name as keyof typeof LucideIcons;
  const component = LucideIcons[IconName];
  if (typeof component === 'function') return component as ElementType;
  return LucideIcons.Circle as ElementType;
};

const categoryLabels: Record<NodeCategory, string> = {
  event: '事件',
  task: '任务',
  gateway: '网关',
  control: '控制',
};

// ─── Draggable Node Item ──────────────────────────────────────

function PaletteItem({ def }: { def: PaletteNodeDef }) {
  const IconComponent = getIconComponent(def.icon);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ nodeType: def.type }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={`
        flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-grab
        transition-all hover:shadow-md hover:-translate-y-0.5 select-none
        bg-white border-gray-200
      `}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: `${def.color}15` }}
      >
        <IconComponent className="h-4 w-4" style={{ color: def.color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">{def.label}</p>
        <p className="text-[10px] text-gray-400 truncate">{def.description}</p>
      </div>
    </div>
  );
}

// ─── Palette Panel ─────────────────────────────────────────────

export default function NodePalette() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<NodeCategory | 'all'>('all');

  const filtered = NODE_PALETTE.filter((n) => {
    const matchSearch =
      !search ||
      n.label.toLowerCase().includes(search.toLowerCase()) ||
      n.type.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === 'all' || n.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const grouped = filtered.reduce<Record<string, PaletteNodeDef[]>>((acc, n) => {
    const cat = n.category;
    acc[cat] = acc[cat] ?? [];
    acc[cat].push(n);
    return acc;
  }, {});

  const categories: NodeCategory[] = ['event', 'task', 'gateway', 'control'];

  return (
    <div className="flex h-full flex-col bg-gray-50 border-r border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-sm font-bold text-gray-800 mb-3">节点面板</h2>

        {/* Search */}
        <input
          type="text"
          placeholder="搜索节点..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />

        {/* Category filter */}
        <div className="flex gap-1 mt-2 flex-wrap">
          <button
            onClick={() => setActiveCategory('all')}
            className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
              activeCategory === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {categories
          .filter((c) => activeCategory === 'all' || activeCategory === c)
          .map((cat) => {
            const items = grouped[cat];
            if (!items?.length) return null;
            return (
              <div key={cat}>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {categoryLabels[cat]}
                </h3>
                <div className="space-y-1.5">
                  {items.map((def) => (
                    <PaletteItem key={def.type} def={def} />
                  ))}
                </div>
              </div>
            );
          })}

        {filtered.length === 0 && (
          <p className="text-center text-xs text-gray-400 py-8">未找到匹配的节点</p>
        )}
      </div>
    </div>
  );
}
