"use client";

import { useRef, useState } from "react";
import { addTodo, deleteTodo, toggleTodo } from "../actions/addTodo";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

export const Todos = ({ todos }: { todos: Todo[] }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const onAddTodo = async () => {
    if (inputRef.current && inputRef.current.value.trim()) {
      setIsAdding(true);
      await addTodo(inputRef.current.value);
      inputRef.current.value = "";
      setIsAdding(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onAddTodo();
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingIds(prev => new Set(prev).add(id));
    await deleteTodo(id);
    setDeletingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleToggle = async (id: string) => {
    setTogglingIds(prev => new Set(prev).add(id));
    await toggleTodo(id);
    setTogglingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

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
      <div css={{
        marginBottom: '2rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        '@media (max-width: 768px)': {
          flexDirection: 'column',
          gap: '1rem'
        }
      }}>
        <input
          type="text"
          ref={inputRef}
          placeholder="What needs to be done?"
          onKeyPress={handleKeyPress}
          css={{
            flex: 1,
            padding: '1rem 1.25rem',
            borderRadius: '50px',
            border: '1px solid #ddd',
            fontSize: '1rem',
            width: '100%',
            transition: 'all 0.3s ease',
            ':focus': {
              outline: 'none',
              borderColor: '#0070f3',
              boxShadow: '0 0 0 3px rgba(0, 112, 243, 0.2)'
            }
          }}
        />
        <button
          onClick={onAddTodo}
          disabled={isAdding}
          css={{
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            padding: '1rem 1.5rem',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 14px rgba(0, 118, 255, 0.39)',
            '@media (max-width: 768px)': {
              width: '100%'
            },
            ':hover': {
              backgroundColor: '#005cc5',
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 20px rgba(0, 118, 255, 0.23)'
            },
            ':disabled': {
              backgroundColor: '#ccc',
              transform: 'none',
              boxShadow: 'none',
              cursor: 'not-allowed'
            }
          }}
        >
          {isAdding ? (
            <span css={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <svg css={{
                width: '16px',
                height: '16px',
                animation: 'spin 1s linear infinite',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="32" strokeDashoffset="8" />
              </svg>
              Adding...
            </span>
          ) : 'Add Task'}
        </button>
      </div>

      {todos.length === 0 ? (
        <div css={{
          textAlign: 'center',
          padding: '3rem 2rem',
          color: '#666',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          borderRadius: '12px',
          border: '2px dashed #ddd'
        }}>
          <svg css={{ width: '50px', height: '50px', marginBottom: '1rem', color: '#ccc' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            <li
              key={todo.id}
              css={{
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                backgroundColor: 'white',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
                border: '1px solid #eaeaea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease',
                opacity: deletingIds.has(todo.id) ? 0.5 : 1,
                ':hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: '0 8px 15px rgba(0, 0, 0, 0.08)'
                }
              }}
            >
              <div css={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <button
                  onClick={() => handleToggle(todo.id)}
                  disabled={togglingIds.has(todo.id)}
                  css={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    border: todo.completed ? 'none' : '2px solid #ddd',
                    backgroundColor: todo.completed ? '#0070f3' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    padding: 0,
                    ':hover': {
                      borderColor: '#0070f3',
                      backgroundColor: todo.completed ? '#005cc5' : 'rgba(0, 112, 243, 0.1)'
                    }
                  }}
                >
                  {togglingIds.has(todo.id) ? (
                    <div css={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      border: '2px solid white',
                      borderTopColor: 'transparent',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                  ) : todo.completed ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : null}
                </button>

                <span css={{
                  fontSize: '1rem',
                  color: todo.completed ? '#999' : '#333',
                  textDecoration: todo.completed ? 'line-through' : 'none',
                  transition: 'all 0.2s ease',
                  wordBreak: 'break-word'
                }}>
                  {todo.title}
                </span>
              </div>

              <button
                onClick={() => handleDelete(todo.id)}
                disabled={deletingIds.has(todo.id)}
                css={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#ff4757',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  ':hover': {
                    backgroundColor: 'rgba(255, 71, 87, 0.1)'
                  },
                  ':disabled': {
                    color: '#ffb8c0',
                    cursor: 'not-allowed'
                  }
                }}
              >
                {deletingIds.has(todo.id) ? (
                  <svg css={{
                    width: '16px',
                    height: '16px',
                    animation: 'spin 0.7s linear infinite',
                  }} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="32" strokeDashoffset="8" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                )}
              </button>
            </li>
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
