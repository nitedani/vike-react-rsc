// Film component styles

export const filmStyles = {
  // Card wrapper for consistent height
  cardWrapper: {
    height: '100%',
    display: 'flex'
  },
  // Card styles for film cards
  card: {
    padding: '1.5rem',
    borderRadius: '16px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.3s ease',
    backgroundColor: 'white',
    ':hover': {
      transform: 'translateY(-10px)',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
    }
  },

  // Card title
  cardTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    color: '#333',
    borderBottom: '2px solid #0070f3',
    paddingBottom: '0.5rem'
  },

  // Card metadata
  cardMetadata: {
    color: '#666',
    marginBottom: '0.5rem',
    fontSize: '0.9rem'
  },

  // Card description
  cardDescription: {
    color: '#666',
    lineHeight: 1.6,
    fontSize: '0.95rem',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 4,
    WebkitBoxOrient: 'vertical'
  },

  // Card button container
  cardButtonContainer: {
    marginTop: 'auto',
    paddingTop: '1rem'
  },

  // Card button
  cardButton: {
    backgroundColor: 'transparent',
    color: '#0070f3',
    border: '1px solid #0070f3',
    borderRadius: '50px',
    padding: '0.5rem 1rem',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#0070f3',
      color: 'white'
    }
  },

  // Card grid
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
    marginTop: '2rem',
    gridAutoRows: '1fr' // Ensure all rows have the same height
  },

  // Modal styles
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '40px', // Ensure there's space at the top
    paddingBottom: '40px', // Ensure there's space at the bottom
    overflow: 'auto', // Allow scrolling on the body
    animation: 'backdropFade 0.2s ease-in',
    '@keyframes backdropFade': {
      '0%': { opacity: 0 },
      '100%': { opacity: 1 }
    }
  },

  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '800px',
    position: 'relative',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
    animation: 'modalEnter 0.3s ease-out',
    '@keyframes modalEnter': {
      '0%': { opacity: 0, transform: 'scale(0.95)' },
      '100%': { opacity: 1, transform: 'scale(1)' }
    }
  },

  // Film details styles for the modal
  filmDetailsContainer: {
    padding: '2rem',
    minHeight: '780px',
  },

  filmTitle: {
    fontSize: '1.75rem',
    fontWeight: '600',
    marginBottom: '1.5rem',
    color: '#333',
    borderBottom: '2px solid #0070f3',
    paddingBottom: '0.5rem',
    textAlign: 'center'
  },

  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem'
  },

  infoLabel: {
    color: '#0070f3',
    fontSize: '0.95rem',
    marginBottom: '0.25rem'
  },

  infoValue: {
    color: '#333',
    fontWeight: '500'
  },

  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '0.75rem',
    color: '#0070f3'
  },

  crawlText: {
    backgroundColor: '#f8f9fa',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    whiteSpace: 'pre-line',
    lineHeight: 1.6,
    color: '#333',
    textAlign: 'center'
  },

  closeButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    zIndex: 10,
    background: 'transparent',
    border: 'none',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999',
    transition: 'all 0.2s ease',
    ':hover': {
      color: '#333'
    }
  },

  // Skeleton styles
  cardSkeleton: {
    backgroundColor: '#f9f9f9',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    animation: 'pulse 1.5s infinite ease-in-out',
    '@keyframes pulse': {
      '0%': { opacity: 0.7 },
      '50%': { opacity: 0.9 },
      '100%': { opacity: 0.7 }
    },
    ':hover': {
      transform: 'none',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
    }
  },

  skeletonTitle: {
    height: '38px',
    width: '60%',
    backgroundColor: '#eaeaea',
    borderRadius: '4px',
    marginBottom: '1.5rem'
  },

  skeletonMetadata: {
    height: '16px',
    width: '60%',
    backgroundColor: '#eaeaea',
    borderRadius: '4px',
    marginBottom: '0.5rem'
  },

  skeletonButton: {
    height: '38px',
    width: '120px',
    backgroundColor: '#eaeaea',
    borderRadius: '50px'
  },

  // Modal skeleton styles
  modalSkeleton: {
    padding: '2rem',
    minHeight: '780px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },

  skeletonInfoGrid: {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    marginBottom: '2rem'
  },

  skeletonInfoItem: {
    height: '60px',
    backgroundColor: '#eaeaea',
    borderRadius: '4px'
  },

  skeletonContent: {
    width: '100%',
    height: '400px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef'
  }
};
