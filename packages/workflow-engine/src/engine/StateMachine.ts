// ============================================================
// StateMachine — execution state transitions with validation
// ============================================================

import type { ExecutionStatus, ExecutionEventType, ExecutionEvent } from '../types';
import { generateId } from '../utils';

const VALID_TRANSITIONS: Record<ExecutionStatus, ExecutionStatus[]> = {
  pending: ['scheduled', 'cancelled'],
  scheduled: ['running', 'cancelled'],
  running: ['waiting', 'successful', 'failed', 'cancelled', 'terminated'],
  waiting: ['running', 'successful', 'failed', 'cancelled', 'terminated'],
  successful: [],     // terminal
  failed: [],         // terminal (unless retried externally)
  cancelled: [],      // terminal
  terminated: [],     // terminal
};

export class StateMachine {
  private status: ExecutionStatus;
  private history: ExecutionStatus[];
  private executionId: string;
  private eventLog: ExecutionEvent[];

  constructor(executionId: string, initialStatus: ExecutionStatus = 'pending') {
    this.executionId = executionId;
    this.status = initialStatus;
    this.history = [initialStatus];
    this.eventLog = [];
  }

  get currentStatus(): ExecutionStatus {
    return this.status;
  }

  get isTerminal(): boolean {
    return ['successful', 'failed', 'cancelled', 'terminated'].includes(this.status);
  }

  /**
   * Transition to a new status. Throws if the transition is invalid.
   */
  transition(newStatus: ExecutionStatus, reason?: string): ExecutionEvent {
    const allowed = VALID_TRANSITIONS[this.status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(
        `Invalid state transition: "${this.status}" → "${newStatus}". ` +
        `Allowed: [${allowed.join(', ')}]`,
      );
    }

    const oldStatus = this.status;
    this.status = newStatus;
    this.history.push(newStatus);

    const eventType: ExecutionEventType = this.resolveEventType(oldStatus, newStatus);
    const event: ExecutionEvent = {
      id: generateId(),
      executionId: this.executionId,
      eventType,
      payload: reason ? { reason, from: oldStatus } : { from: oldStatus },
      sequenceNumber: this.eventLog.length + 1,
      createdAt: new Date(),
    };

    this.eventLog.push(event);
    return event;
  }

  /**
   * Get the full status history.
   */
  getHistory(): ExecutionStatus[] {
    return [...this.history];
  }

  /**
   * Get all events emitted by this state machine.
   */
  getEvents(): ExecutionEvent[] {
    return [...this.eventLog];
  }

  private resolveEventType(
    _from: ExecutionStatus,
    to: ExecutionStatus,
  ): ExecutionEventType {
    switch (to) {
      case 'successful':
        return 'EXECUTION_COMPLETED';
      case 'failed':
        return 'EXECUTION_FAILED';
      case 'cancelled':
        return 'EXECUTION_CANCELLED';
      default:
        return 'STATUS_CHANGED';
    }
  }
}
