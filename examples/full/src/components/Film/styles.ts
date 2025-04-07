"use client";

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
    borderRadius: '12px',
    height: '100%',
    minHeight: "220px",
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    backgroundColor: 'white',
    position: 'relative'
  },

  // Episode badge
  cardEpisodeBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    backgroundColor: '#0070f3',
    color: 'white',
    fontSize: '0.8rem',
    fontWeight: '600',
    padding: '0.25rem 0.75rem',
    borderRadius: '50px',
    boxShadow: '0 2px 4px rgba(0, 112, 243, 0.2)'
  },

  // Card title
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '0.75rem',
    color: '#333',
    borderBottom: '1px solid #eaeaea',
    paddingBottom: '0.5rem'
  },

  // Metadata container
  cardMetadataContainer: {
    marginBottom: '0.75rem'
  },

  // Card metadata
  cardMetadata: {
    color: '#666',
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
    ':last-child': {
      marginBottom: 0
    }
  },

  // Metadata label
  metadataLabel: {
    fontWeight: '600',
    color: '#0070f3'
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
    paddingTop: '1rem',
    display: 'flex',
    justifyContent: 'center'
  },

  // Card button
  cardButton: {
    backgroundColor: 'transparent',
    color: '#0070f3',
    border: '1px solid #0070f3',
    borderRadius: '50px',
    padding: '0.5rem 1.25rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#0070f3',
      color: 'white',
      boxShadow: '0 4px 6px rgba(0, 112, 243, 0.2)'
    }
  },

  // Card grid
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.5rem',
    marginTop: '2rem',
    marginBottom: '2rem',
    '@media (max-width: 1024px)': {
      gridTemplateColumns: 'repeat(2, 1fr)'
    },
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr'
    }
  },

  // Modal styles
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'flex-start', // Align to top to allow bottom overflow
    justifyContent: 'center',
    padding: '40px 40px 80px 40px', // More padding at bottom for scrolling
    overflowY: 'auto', // Allow scrolling when content overflows
    overflowX: 'hidden', // Prevent horizontal scrolling
    animation: 'backdropFade 0.25s ease-in',
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
    height: 'auto',
    minHeight: '650px', // Set a minimum height to match skeleton
    position: 'relative',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden', // Hide any content that overflows
    marginTop: '40px', // Add top margin to prevent overflow at top of viewport
    animation: 'modalEnter 0.2s ease-out',
    '@media (max-width: 768px)': {
      margin: '20px', // Smaller margins on mobile
    },
    '@keyframes modalEnter': {
      '0%': { opacity: 0, transform: 'translateY(10px)' },
      '100%': { opacity: 1, transform: 'translateY(0)' }
    }
  },

  // Film details styles for the modal
  filmDetailsContainer: {
    padding: '2rem',
    height: '100%', // Take full height of parent
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  },

  filmTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
    color: '#333',
    borderBottom: '2px solid #0070f3',
    paddingBottom: '0.75rem',
    textAlign: 'center'
  },

  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.5rem',
    marginBottom: '2rem',
    '@media (max-width: 768px)': {
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
    }
  },

  infoItem: {
    marginBottom: '1rem',
  },

  infoLabel: {
    color: '#0070f3',
    fontSize: '0.9rem',
    fontWeight: '600',
    marginBottom: '0.25rem',
    display: 'block',
  },

  infoValue: {
    color: '#333',
    fontWeight: '500',
    fontSize: '1.1rem'
  },

  crawlSection: {
    marginBottom: '2rem',
    flex: 1
  },

  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '1rem',
    color: '#0070f3',
    display: 'inline-block',
    borderBottom: '2px solid #0070f3',
    paddingBottom: '0.25rem'
  },

  crawlText: {
    backgroundColor: '#f8f9fa',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    whiteSpace: 'pre-line',
    lineHeight: 1.8,
    color: '#333',
    textAlign: 'center',
    fontSize: '1rem'
  },

  closeButton: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    zIndex: 10,
    background: 'transparent',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    transition: 'all 0.2s ease',
    ':hover': {
      color: '#333',
    }
  },

  // Skeleton styles
  cardSkeleton: {
    backgroundColor: '#f9f9f9',
    animation: 'pulse 1.5s infinite ease-in-out',
    '@keyframes pulse': {
      '0%': { opacity: 0.7 },
      '50%': { opacity: 0.9 },
      '100%': { opacity: 0.7 }
    }
  },

  skeletonEpisodeBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '70px',
    height: '24px',
    backgroundColor: '#eaeaea',
    borderRadius: '50px'
  },

  skeletonTitle: {
    height: '40px',
    width: '60%',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    marginBottom: '2rem',
    alignSelf: 'center' // Center the title like in the modal
  },

  skeletonMetadata: {
    height: '16px',
    width: '60%',
    backgroundColor: '#eaeaea',
    borderRadius: '4px',
    marginBottom: '1rem'
  },

  skeletonButton: {
    height: '36px',
    width: '100px',
    backgroundColor: '#eaeaea',
    borderRadius: '50px'
  },

  // Modal skeleton styles
  modalSkeleton: {
    padding: '2rem',
    maxHeight: 'calc(100vh - 80px)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '100%'
  },

  skeletonInfoItem: {
    height: '50px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    marginBottom: '1rem',
    width: '60%'
  },

  skeletonContent: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    flex: 1,
    minHeight: '600px' // Make it tall enough to match the modal content
  }
};
