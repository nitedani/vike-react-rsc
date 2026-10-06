// Runs after a server action of the same request, so the count includes a task it added
export function data() {
  const todos = (globalThis as { __todos?: unknown[] }).__todos ?? [];
  return { todoCount: todos.length };
}
