"use client";

import { useState, useTransition } from "react";

export default function MobileMenuClient({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const toggleMenu = () => {
    startTransition(() => {
      setMenuOpen(!menuOpen);
    });
  };

  return (
    <>
      <div css={{
        '@media (max-width: 768px)': {
          display: menuOpen ? 'flex' : 'none',
          flexDirection: 'column',
          width: '100%',
          gap: '0.5rem'
        }
      }}>
        {children}
      </div>

      <button
        onClick={toggleMenu}
        disabled={isPending}
        css={{
          display: 'none',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.5rem',
          opacity: isPending ? 0.7 : 1,
          '@media (max-width: 768px)': {
            display: 'block',
            position: 'absolute',
            top: '1rem',
            right: '1rem'
          }
        }}
      >
        {menuOpen ? '✕' : '☰'}
      </button>
    </>
  );
}
