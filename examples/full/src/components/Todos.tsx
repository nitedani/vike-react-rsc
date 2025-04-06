import TodoFormClient from './TodoFormClient';
import TodoItemClient from './TodoItemClient';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

export const Todos = ({ todos }: { todos: Todo[] }) => {
  return (
    <div css={{
      maxWidth: '700px',
      margin: '0 auto',
      padding: '2rem',
      borderRadius: '16px',
      background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
      boxShadow: '20px 20px 60px #d9d9d9, -20px -20px 60px #ffffff',
      '@media (max-width: 768px)': {
        padding: '1.5rem'
      }
    }}>
      <TodoFormClient />

      {todos.length === 0 ? (
        <div css={{
          textAlign: 'center',
          padding: '3rem 2rem',
          color: '#666',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          borderRadius: '12px',
          border: '2px dashed #ddd'
        }}>
          <svg style={{ width: '50px', height: '50px', marginBottom: '1rem', color: '#ccc' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 19H6.2c-1.12 0-1.68 0-2.108-.218a2 2 0 0 1-.874-.874C3 17.48 3 16.92 3 15.8V8.2c0-1.12 0-1.68.218-2.108a2 2 0 0 1 .874-.874C4.52 5 5.08 5 6.2 5h11.6c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874C21 6.52 21 7.08 21 8.2V11M17 21v-6M14 18h6M10 9H6m4 4H6" />
          </svg>
          <p css={{ fontSize: '1.1rem', fontWeight: '500' }}>No tasks yet. Add one to get started!</p>
        </div>
      ) : (
        <ul css={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          {todos.map((todo) => (
            <TodoItemClient key={todo.id} todo={todo} />
          ))}
        </ul>
      )}

      {todos.length > 0 && (
        <div css={{
          marginTop: '1.5rem',
          padding: '1rem',
          borderRadius: '8px',
          backgroundColor: 'rgba(0, 112, 243, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#666',
          fontSize: '0.9rem'
        }}>
          <span>{todos.length} {todos.length === 1 ? 'task' : 'tasks'}</span>
          <span>{todos.filter(t => t.completed).length} completed</span>
        </div>
      )}
    </div>
  );
};
