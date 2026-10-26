// Runs after a server action of the same request, so the count includes a task it added
export function data() {
  const todos = (globalThis as { __todos?: unknown[] }).__todos ?? [];
  const todoCount = todos.length;
  return {
    todoCount,
    // Streamed to the browser. Like a database row or Object.groupBy()'s result, it isn't a plain object.
    todoCountStreamed: Promise.resolve(Object.assign(Object.create(null), { todoCount })),
  };
}
