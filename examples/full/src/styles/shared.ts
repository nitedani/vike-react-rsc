// Shared styles for consistent UI across all pages

export const sharedStyles = {
  // Page container
  pageContainer: {
    width: '100%',
    overflowX: 'hidden'
  },

  // Section styles
  section: {
    padding: '2rem',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
    marginBottom: '3rem',
    backgroundColor: 'white'
  },

  // Header section
  headerSection: {
    textAlign: 'center',
    marginBottom: '3rem'
  },

  // Main heading
  mainHeading: {
    fontSize: '3rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
    background: 'linear-gradient(90deg, #0070f3, #00c6ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    '@media (max-width: 768px)': {
      fontSize: '2.25rem'
    }
  },

  // Section heading
  sectionHeading: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
    color: '#333',
    textAlign: 'center'
  },

  // Feature heading
  featureHeading: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '0.75rem',
    color: '#333'
  },

  // Main paragraph
  paragraph: {
    fontSize: '1.25rem',
    color: '#666',
    maxWidth: '700px',
    margin: '0 auto 2rem',
    lineHeight: 1.6,
    textAlign: 'center'
  },

  // Feature paragraph
  featureParagraph: {
    fontSize: '0.95rem',
    color: '#666',
    lineHeight: 1.6
  },

  // Feature grid
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    maxWidth: '1000px',
    margin: '0 auto',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr'
    }
  },

  // Feature card
  featureCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.3s ease',
    ':hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)'
    }
  },

  // Feature icon container
  featureIconContainer: {
    width: '50px',
    height: '50px',
    borderRadius: '10px',
    backgroundColor: 'rgba(0, 112, 243, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem'
  },

  // Feature number
  featureNumber: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: '#0070f3',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },

  // Back link
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    color: '#0070f3',
    textDecoration: 'none',
    fontSize: '1.1rem',
    fontWeight: '500',
    padding: '0.5rem 1rem',
    borderRadius: '50px',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: 'rgba(0, 112, 243, 0.05)',
      transform: 'translateY(-2px)'
    }
  }
};
