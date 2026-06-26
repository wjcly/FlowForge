// ============================================================
// Utility functions — JSONPath evaluation, ID generation, etc.
// ============================================================

/**
 * Simple JSONPath evaluator supporting:
 * - "foo"           → root.foo
 * - "foo.bar"       → root.foo.bar
 * - "foo[0]"        → root.foo[0]
 * - "foo.bar.baz"   → root.foo.bar.baz
 */
export function evaluateJsonPath(
  data: unknown,
  path: string,
): unknown {
  if (!path || typeof path !== 'string') return data;

  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let current: unknown = data;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Set a value at a JSONPath. Creates intermediate objects as needed.
 */
export function setJsonPath(
  data: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  if (!path || typeof path !== 'string') return;

  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let current: Record<string, unknown> = data;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object' || current[part] == null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastKey = parts[parts.length - 1];
  if (lastKey != null) {
    current[lastKey] = value;
  }
}

/**
 * Generate a unique ID (UUID v4 style).
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Deep clone an object via structured serialization.
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Sleep for the given milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
