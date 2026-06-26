import { describe, it, expect } from 'vitest';
import { StateMachine } from '../src/engine/StateMachine';

describe('StateMachine', () => {
  it('should start in pending state', () => {
    const sm = new StateMachine('exec-1');
    expect(sm.currentStatus).toBe('pending');
  });

  it('should allow valid transitions', () => {
    const sm = new StateMachine('exec-1');
    sm.transition('scheduled');
    expect(sm.currentStatus).toBe('scheduled');

    sm.transition('running');
    expect(sm.currentStatus).toBe('running');

    sm.transition('successful');
    expect(sm.currentStatus).toBe('successful');
    expect(sm.isTerminal).toBe(true);
  });

  it('should reject invalid transitions', () => {
    const sm = new StateMachine('exec-1');
    expect(() => sm.transition('successful')).toThrow('Invalid state transition');
  });

  it('should track history', () => {
    const sm = new StateMachine('exec-1');
    sm.transition('scheduled');
    sm.transition('running');
    sm.transition('successful');

    expect(sm.getHistory()).toEqual([
      'pending',
      'scheduled',
      'running',
      'successful',
    ]);
  });

  it('should emit events on transitions', () => {
    const sm = new StateMachine('exec-1');
    sm.transition('scheduled');
    sm.transition('running');

    const events = sm.getEvents();
    expect(events.length).toBe(2);
    expect(events[0].eventType).toBe('STATUS_CHANGED');
  });

  it('should allow pending → cancelled', () => {
    const sm = new StateMachine('exec-1');
    sm.transition('cancelled');
    expect(sm.currentStatus).toBe('cancelled');
    expect(sm.isTerminal).toBe(true);
  });

  it('should allow running → waiting → running', () => {
    const sm = new StateMachine('exec-1');
    sm.transition('scheduled');
    sm.transition('running');
    sm.transition('waiting');
    expect(sm.currentStatus).toBe('waiting');

    sm.transition('running');
    expect(sm.currentStatus).toBe('running');
  });
});
