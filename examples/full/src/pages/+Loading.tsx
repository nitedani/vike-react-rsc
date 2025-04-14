export const Loading = {
  layout: () => (
    <div css={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      width: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 1000
    }}>
      <div css={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div css={{
          width: '50px',
          height: '50px',
          border: '5px solid #f3f3f3',
          borderTop: '5px solid #0070f3',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' }
          }
        }} />
        <div css={{
          fontSize: '1.25rem',
          fontWeight: 500,
          color: '#0070f3'
        }}>
          Loading...
        </div>
      </div>
    </div>
  ),
};
