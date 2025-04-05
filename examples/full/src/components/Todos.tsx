"use client";

import { useRef, useState } from "react";
import { addTodo } from "../actions/addTodo";

export const Todos = ({ todos }: { todos: string[] }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isAdding, setIsAdding] = useState(false);

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

  return (
    <div css={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '2rem',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <div css={{
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center'
      }}>
        <input
          type="text"
          ref={inputRef}
          placeholder="What needs to be done?"
          onKeyPress={handleKeyPress}
          css={{
            flex: 1,
            padding: '0.75rem 1rem',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '1rem',
            ':focus': {
              outline: 'none',
              borderColor: '#0070f3',
              boxShadow: '0 0 0 2px rgba(0, 112, 243, 0.2)'
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
            borderRadius: '4px',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            ':hover': {
              backgroundColor: '#005cc5',
            },
            ':disabled': {
              backgroundColor: '#ccc',
              cursor: 'not-allowed'
            }
          }}
        >
          {isAdding ? 'Adding...' : 'Add Todo'}
        </button>
      </div>

      {todos.length === 0 ? (
        <div css={{
          textAlign: 'center',
          padding: '2rem',
          color: '#666',
          backgroundColor: 'white',
          borderRadius: '4px',
          border: '1px dashed #ddd'
        }}>
          <p>No todos yet. Add one to get started!</p>
        </div>
      ) : (
        <ul css={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {todos.map((todo, index) => (
            <li
              key={index}
              css={{
                padding: '1rem',
                borderRadius: '4px',
                backgroundColor: 'white',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                border: '1px solid #eaeaea',
                display: 'flex',
                alignItems: 'center',
                transition: 'transform 0.2s ease',
                ':hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                }
              }}
            >
              <span css={{
                marginRight: '0.5rem',
                color: '#0070f3',
                fontWeight: 'bold'
              }}>
                {index + 1}.
              </span>
              {todo}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
