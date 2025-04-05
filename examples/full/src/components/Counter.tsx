"use client";

import { usePageContext } from "vike-react-rsc/pageContext";
import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);
  const ctx = usePageContext();
  console.log(ctx.pageId);

  return (
    <div css={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      maxWidth: '300px',
      margin: '0 auto'
    }}>
      <p css={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        margin: '0 0 1.5rem 0',
        color: '#0070f3'
      }}>Count: {count}</p>
      <button
        onClick={() => setCount(count + 1)}
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
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
          },
          ':active': {
            transform: 'translateY(0)'
          }
        }}
      >
        Increment
      </button>
    </div>
  );
}
