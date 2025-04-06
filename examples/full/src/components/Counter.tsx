import CounterClient from './CounterClient';
import { getCount } from '../actions/counter';

export default async function Counter() {
  // Get the initial count from the server
  const counterState = await getCount();

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

      <CounterClient initialCount={counterState.count} />

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
