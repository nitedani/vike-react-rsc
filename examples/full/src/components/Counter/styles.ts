// Counter component styles

export const counterStyles = {
  // Main container
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '3rem',
    borderRadius: '16px',
    backgroundColor: 'white',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
    maxWidth: '400px',
    margin: '0 auto',
    position: 'relative',
    overflow: 'hidden',
    '@media (max-width: 768px)': {
      padding: '2rem',
      maxWidth: '300px'
    }
  },

  // Gradient bar
  gradientBar: {
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
  },

  // Counter display container
  displayContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    margin: '0 0 2rem 0',
  },

  // Counter number
  number: {
    fontSize: '5rem',
    fontWeight: '700',
    color: '#333',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    '@media (max-width: 768px)': {
      fontSize: '4rem'
    }
  },

  // Number with pending animation
  numberPending: {
    transform: 'scale(1.2)'
  },

  // Increment button
  incrementButton: {
    backgroundColor: '#0070f3',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    padding: '1rem 2rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 14px rgba(0, 118, 255, 0.39)',
    ':hover': {
      backgroundColor: '#005cc5',
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(0, 118, 255, 0.23)'
    },
    ':active': {
      transform: 'translateY(0)',
      boxShadow: '0 3px 8px rgba(0, 118, 255, 0.23)'
    }
  },

  // Description text
  description: {
    marginTop: '1.5rem',
    fontSize: '0.9rem',
    color: '#666',
    textAlign: 'center'
  },

  // Refresh button container
  refreshContainer: {
    position: 'absolute',
    right: '1rem',
    top: '1rem',
    opacity: 0.7,
    transition: 'opacity 0.2s ease',
    ':hover': { opacity: 1 }
  },

  // Refresh button
  refreshButton: {
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
  }
};
