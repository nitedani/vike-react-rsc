import TodoFormClient from './TodoFormClient';
import TodoItemClient from './TodoItemClient';
import { todoStyles } from './styles';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

export const Todos = ({ todos }: { todos: Todo[] }) => {
  const completedCount = todos.filter(t => t.completed).length;

  return (
    <div css={todoStyles.container}>
      <TodoFormClient />

      {/* Task container with minimum height to prevent layout shift */}
      <div css={todoStyles.taskContainer}>
        {todos.length === 0 ? (
          <div css={todoStyles.emptyState}>
            <svg style={{ width: '50px', height: '50px', marginBottom: '1rem', color: '#ccc' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 19H6.2c-1.12 0-1.68 0-2.108-.218a2 2 0 0 1-.874-.874C3 17.48 3 16.92 3 15.8V8.2c0-1.12 0-1.68.218-2.108a2 2 0 0 1 .874-.874C4.52 5 5.08 5 6.2 5h11.6c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874C21 6.52 21 7.08 21 8.2V11M17 21v-6M14 18h6M10 9H6m4 4H6" />
            </svg>
            <p css={todoStyles.emptyStateText}>No tasks yet. Add one to get started!</p>
          </div>
        ) : (
          <ul css={todoStyles.taskList}>
            {todos.map((todo) => (
              <TodoItemClient key={todo.id} todo={todo} />
            ))}
          </ul>
        )}
      </div>

      {/* Status bar - always visible for consistent layout */}
      <div css={todoStyles.statusBar}>
        <span>{todos.length} {todos.length === 1 ? 'task' : 'tasks'}</span>
        <span>{completedCount} completed</span>
      </div>
    </div>
  );
};
