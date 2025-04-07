"use client";

import React from 'react';
import { useTransition } from 'react';

interface PageInfo {
  name: string;
  path: string;
  description: string;
}

const pages: PageInfo[] = [
  {
    name: "Home",
    path: "/",
    description: "Introduction to Vike React Server Components"
  },
  {
    name: "Tasks",
    path: "/todos",
    description: "Interactive todo app with server actions"
  },
  {
    name: "Suspense",
    path: "/suspense",
    description: "Component-level loading with Suspense"
  },
  {
    name: "Loading",
    path: "/data",
    description: "Page-level loading states"
  }
];

export default function GuideNavigation({ currentPath }: { currentPath: string }) {
  const [isPending, startTransition] = useTransition();
  
  // Find the current page index
  const currentIndex = pages.findIndex(page => page.path === currentPath);
  
  // Determine previous and next pages
  const prevPage = currentIndex > 0 ? pages[currentIndex - 1] : null;
  const nextPage = currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null;
  
  // If we're on the last page, the next should loop back to home
  const finalNextPage = nextPage || pages[0];
  
  return (
    <div css={{
      marginTop: '3rem',
      padding: '1.5rem',
      borderRadius: '16px',
      backgroundColor: '#f8f9fa',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      border: '1px solid #eaeaea',
    }}>
      <h2 css={{
        fontSize: '1.5rem',
        fontWeight: '600',
        marginBottom: '1rem',
        color: '#333',
        textAlign: 'center'
      }}>
        Guided Tour
      </h2>
      
      <div css={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1.5rem'
      }}>
        {pages.map((page, index) => (
          <div 
            key={page.path}
            css={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: index === currentIndex ? '#0070f3' : '#ddd',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
      
      <p css={{
        textAlign: 'center',
        color: '#666',
        marginBottom: '1.5rem',
        fontSize: '1.1rem'
      }}>
        {currentIndex + 1} of {pages.length}: <strong>{pages[currentIndex]?.name}</strong> - {pages[currentIndex]?.description}
      </p>
      
      <div css={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '1rem',
        '@media (max-width: 768px)': {
          flexDirection: 'column'
        }
      }}>
        {prevPage ? (
          <a
            href={prevPage.path}
            css={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.75rem 1.25rem',
              borderRadius: '50px',
              backgroundColor: 'white',
              color: '#0070f3',
              border: '1px solid #0070f3',
              textDecoration: 'none',
              fontWeight: '500',
              transition: 'all 0.3s ease',
              flex: 1,
              justifyContent: 'center',
              ':hover': {
                backgroundColor: 'rgba(0, 112, 243, 0.05)',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
              },
              '@media (max-width: 768px)': {
                width: '100%'
              }
            }}
          >
            <span css={{ marginRight: '0.5rem' }}>←</span> Previous: {prevPage.name}
          </a>
        ) : (
          <div css={{ flex: 1 }} /> // Empty spacer when no previous page
        )}
        
        <a
          href={finalNextPage.path}
          css={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.75rem 1.25rem',
            borderRadius: '50px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            textDecoration: 'none',
            fontWeight: '500',
            transition: 'all 0.3s ease',
            flex: 1,
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0, 118, 255, 0.39)',
            ':hover': {
              backgroundColor: '#005cc5',
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 20px rgba(0, 118, 255, 0.23)'
            },
            '@media (max-width: 768px)': {
              width: '100%'
            }
          }}
        >
          {nextPage ? `Next: ${nextPage.name}` : 'Back to Home'} <span css={{ marginLeft: '0.5rem' }}>→</span>
        </a>
      </div>
    </div>
  );
}
