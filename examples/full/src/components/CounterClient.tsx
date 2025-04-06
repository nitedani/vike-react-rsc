"use client";

import { useState, useTransition } from "react";
import { incrementCount, getCount } from "../actions/counter";

interface CounterClientProps {
  initialCount: number;
}

export default function CounterClient({ initialCount }: CounterClientProps) {
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  // Increment without re-rendering the page
  const handleIncrement = () => {
    startTransition(async () => {
      // Call the server action to increment the count
      const counterState = await incrementCount();
      setCount(counterState.count);
    });
  };

  // Refresh without re-rendering the page
  const handleRefresh = () => {
    startTransition(async () => {
      // Get the latest count from the server without incrementing
      const counterState = await getCount();
      setCount(counterState.count);
    });
  };

  return (
    <>
      <div css={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '0 0 2rem 0',
      }}>
        <div css={{
          fontSize: '5rem',
          fontWeight: '700',
          color: '#333',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          transform: isPending ? 'scale(1.2)' : 'scale(1)',
          '@media (max-width: 768px)': {
            fontSize: '4rem'
          }
        }}>
          {count}
        </div>
      </div>



      <button
        onClick={() => {
          if (!isPending) {
            handleIncrement();
          }
        }}
        css={{
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          padding: '1rem 2.5rem',
          fontSize: '1.1rem',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 1,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '300%',
            height: '300%',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%) scale(0)',
            transition: 'transform 0.6s ease-out',
            zIndex: -1
          },
          ':hover': {
            transform: 'translateY(-3px)',
            boxShadow: '0 10px 20px rgba(0, 112, 243, 0.3)',
            '&::before': {
              transform: 'translate(-50%, -50%) scale(1)'
            }
          },
          ':active': {
            transform: 'translateY(0)',
            boxShadow: '0 5px 10px rgba(0, 112, 243, 0.2)'
          },
          '@media (max-width: 768px)': {
            padding: '0.8rem 2rem',
            fontSize: '1rem'
          }
        }}
      >
        Increment
      </button>

      <div css={{
        position: 'absolute',
        right: '1rem',
        top: '1rem',
        opacity: 0.7,
        transition: 'opacity 0.2s ease',
        ':hover': { opacity: 1 }
      }}>
        <button
          onClick={() => {
            if (!isPending) {
              handleRefresh();
            }
          }}
          css={{
            backgroundColor: 'transparent',
            color: '#0070f3',
            border: 'none',
            borderRadius: '50%',
            padding: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            ':hover': {
              backgroundColor: 'rgba(0, 112, 243, 0.1)'
            }
          }}
          title="Refresh counter"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>
    </>
  );
}
