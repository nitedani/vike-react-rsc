"use client";

import { useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div css={{
      fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#333',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 1rem',
      minHeight: 'calc(100% - 1px)', /* Subtracting 1px prevents scrollbar */
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      '& *': {
        boxSizing: 'border-box'
      }
    }}>
      {/* No fixed div needed */}
      <header css={{
        padding: '1rem 0',
        borderBottom: '1px solid #eaeaea',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        backgroundColor: 'white',
        zIndex: 10,
        '@media (max-width: 768px)': {
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '1rem'
        }
      }}>
        <div css={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
          <a href="/" css={{ textDecoration: 'none', color: '#0070f3' }}>Vike RSC</a>
        </div>

        <div css={{
          '@media (max-width: 768px)': {
            display: menuOpen ? 'flex' : 'none',
            flexDirection: 'column',
            width: '100%',
            gap: '0.5rem'
          }
        }}>
          <nav css={{
            display: 'flex',
            gap: '1.5rem',
            '@media (max-width: 768px)': {
              flexDirection: 'column',
              gap: '0.75rem'
            }
          }}>
            <a href="/" css={{
              textDecoration: 'none',
              color: '#333',
              fontWeight: 600,
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              ':hover': {
                color: '#0070f3',
                backgroundColor: 'rgba(0, 112, 243, 0.05)'
              }
            }}>Home</a>
            <a href="/todos" css={{
              textDecoration: 'none',
              color: '#333',
              fontWeight: 600,
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              ':hover': {
                color: '#0070f3',
                backgroundColor: 'rgba(0, 112, 243, 0.05)'
              }
            }}>Tasks</a>
            <a href="/suspense" css={{
              textDecoration: 'none',
              color: '#333',
              fontWeight: 600,
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              ':hover': {
                color: '#0070f3',
                backgroundColor: 'rgba(0, 112, 243, 0.05)'
              }
            }}>Suspense</a>
            <a href="/data" css={{
              textDecoration: 'none',
              color: '#333',
              fontWeight: 600,
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              ':hover': {
                color: '#0070f3',
                backgroundColor: 'rgba(0, 112, 243, 0.05)'
              }
            }}>Loading</a>
            <a href="https://github.com/nitedani/vike-react-rsc" target="_blank" css={{
              textDecoration: 'none',
              color: '#333',
              fontWeight: 600,
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              ':hover': {
                color: '#0070f3',
                backgroundColor: 'rgba(0, 112, 243, 0.05)'
              }
            }}>GitHub</a>
          </nav>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          css={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
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
      </header>

      <main css={{ flex: 1, padding: '2rem 0', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
        {children}
      </main>

      <footer css={{
        borderTop: '1px solid #eaeaea',
        padding: '2rem 0',
        textAlign: 'center',
        color: '#666'
      }}>
        <p>Vike React Server Components Demo</p>
      </footer>
    </div>
  );
}
