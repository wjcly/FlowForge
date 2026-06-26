// ============================================================
// EventBus — internal pub/sub for workflow lifecycle events
// ============================================================

import type { ExecutionEventType, ExecutionEvent } from '../types';

type EventHandler = (event: ExecutionEvent) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<ExecutionEventType, Set<EventHandler>>();
  private wildcardHandlers = new Set<EventHandler>();

  /**
   * Subscribe to a specific event type.
   */
  on(eventType: ExecutionEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Subscribe to ALL events.
   */
  onAny(handler: EventHandler): () => void {
    this.wildcardHandlers.add(handler);
    return () => {
      this.wildcardHandlers.delete(handler);
    };
  }

  /**
   * Emit an event to all matching handlers.
   */
  async emit(event: ExecutionEvent): Promise<void> {
    const typeHandlers = this.handlers.get(event.eventType);
    if (typeHandlers) {
      await Promise.allSettled(
        Array.from(typeHandlers).map((h) => h(event)),
      );
    }

    await Promise.allSettled(
      Array.from(this.wildcardHandlers).map((h) => h(event)),
    );
  }

  /**
   * Remove all handlers.
   */
  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
  }
}
