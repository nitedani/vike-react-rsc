"use client";

import { usePageContext } from "vike-react-rsc/pageContext";
import { useState, useEffect } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const ctx = usePageContext();
  console.log(ctx.pageId);

  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  const handleIncrement = () => {
    setCount(count + 1);
    setIsAnimating(true);
  };

  return (
    <div css={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '3rem',
      borderRadius: '16px',
      background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
      boxShadow: '20px 20px 60px #d9d9d9, -20px -20px 60px #ffffff',
      maxWidth: '400px',
      margin: '0 auto',
      position: 'relative',
      overflow: 'hidden',
      '@media (max-width: 768px)': {
        padding: '2rem',
        maxWidth: '300px'
      }
    }}>
      <div css={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '6px',
        background: 'linear-gradient(90deg, #0070f3, #00c6ff, #0070f3)',
        backgroundSize: '200% 100%',
        animation: 'gradientMove 3s ease infinite',
        '@keyframes gradientMove': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' }
        }
      }} />

      <div css={{
        fontSize: '5rem',
        fontWeight: '700',
        margin: '0 0 2rem 0',
        color: '#333',
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        transform: isAnimating ? 'scale(1.2)' : 'scale(1)',
        '@media (max-width: 768px)': {
          fontSize: '4rem'
        }
      }}>
        {count}
      </div>

      <button
        onClick={handleIncrement}
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

      <p css={{
        marginTop: '1.5rem',
        fontSize: '0.9rem',
        color: '#666',
        textAlign: 'center'
      }}>
        Client-side interactivity with React
      </p>
    </div>
  );
}
