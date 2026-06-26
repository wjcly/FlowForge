// ============================================================
// NodeRegistry — plugin system for workflow node types
// ============================================================

import type { NodeType, NodeCategory } from '../../types';
import type { BaseNode } from './base/BaseNode';

export interface NodePluginInfo {
  type: NodeType;
  category: NodeCategory;
  label: string;
  icon?: string;
  description?: string;
}

export class NodeRegistry {
  private registry = new Map<NodeType, BaseNode>();

  /**
   * Register a node handler. Throws if already registered.
   */
  register(node: BaseNode): void {
    if (this.registry.has(node.type)) {
      throw new Error(`Node type "${node.type}" is already registered`);
    }
    this.registry.set(node.type, node);
  }

  /**
   * Unregister a node handler.
   */
  unregister(type: NodeType): boolean {
    return this.registry.delete(type);
  }

  /**
   * Get a registered node handler by type.
   */
  get(type: NodeType): BaseNode | undefined {
    return this.registry.get(type);
  }

  /**
   * Check if a node type is registered.
   */
  has(type: NodeType): boolean {
    return this.registry.has(type);
  }

  /**
   * Get all registered node types.
   */
  getTypes(): NodeType[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get info about all registered nodes (for UI palette).
   */
  getAllInfo(): NodePluginInfo[] {
    return Array.from(this.registry.values()).map((node) => ({
      type: node.type,
      category: node.category,
      label: node.label,
      icon: node.icon,
    }));
  }

  /**
   * Get nodes filtered by category.
   */
  getByCategory(category: NodeCategory): NodePluginInfo[] {
    return this.getAllInfo().filter((info) => info.category === category);
  }

  /**
   * Clear all registrations.
   */
  clear(): void {
    this.registry.clear();
  }

  /**
   * Get the total count of registered nodes.
   */
  get size(): number {
    return this.registry.size;
  }
}
