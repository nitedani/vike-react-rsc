// Layout styles for consistent UI across all pages

export const layoutStyles = {
  // Main container
  container: {
    color: '#333',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1.5rem',
    minHeight: 'calc(100vh - 1px)', /* Subtracting 1px prevents scrollbar */
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    '& *': {
      boxSizing: 'border-box'
    }
  },

  // Header
  header: {
    padding: '1.25rem 0',
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
  },

  // Logo
  logo: {
    fontWeight: 'bold',
    fontSize: '1.5rem'
  },

  // Logo link
  logoLink: {
    textDecoration: 'none',
    color: '#0070f3'
  },

  // Navigation
  nav: {
    display: 'flex',
    gap: '1.5rem',
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      gap: '0.75rem'
    }
  },

  // Nav link
  navLink: {
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
  },

  // Active nav link
  activeNavLink: {
    color: '#0070f3',
    backgroundColor: 'rgba(0, 112, 243, 0.05)'
  },

  // Main content
  main: {
    flex: 1,
    padding: '2rem 0'
  },

  // Footer
  footer: {
    padding: '2rem 0',
    borderTop: '1px solid #eaeaea',
    textAlign: 'center',
    color: '#666',
    fontSize: '0.9rem'
  }
};
