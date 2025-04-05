import Counter from "../../components/Counter";
import { getPageContext } from "vike-react-rsc/pageContext";

export default async function Page() {
  const ctx = getPageContext();
  console.log(ctx.pageId);

  return (
    <div css={{ width: '100%', overflowX: 'hidden' }}>
      {/* Hero Section */}
      <section css={{
        minHeight: 'calc(100vh - 200px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '4rem 0',
        position: 'relative',
        overflow: 'hidden',
        '@media (max-width: 768px)': {
          padding: '3rem 0',
          minHeight: 'calc(100vh - 150px)'
        }
      }}>
        <div css={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(0, 112, 243, 0.05) 0%, rgba(255, 255, 255, 0) 70%)',
          zIndex: -1
        }} />

        <h1 css={{
          fontSize: '4rem',
          fontWeight: '800',
          marginBottom: '1.5rem',
          background: 'linear-gradient(90deg, #0070f3, #00c6ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center',
          maxWidth: '900px',
          lineHeight: 1.2,
          '@media (max-width: 768px)': {
            fontSize: '2.5rem'
          }
        }}>Vike React Server Components</h1>

        <p css={{
          fontSize: '1.5rem',
          color: '#666',
          maxWidth: '800px',
          margin: '0 auto 3rem',
          lineHeight: 1.6,
          textAlign: 'center',
          '@media (max-width: 768px)': {
            fontSize: '1.2rem',
            margin: '0 auto 2rem'
          }
        }}>
          Experience the perfect blend of server-side rendering and client-side interactivity
        </p>

        <div css={{
          marginBottom: '5rem',
          width: '100%',
          maxWidth: '500px',
          '@media (max-width: 768px)': {
            marginBottom: '3rem'
          }
        }}>
          <Counter />
        </div>

        <div css={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
          marginTop: '1rem'
        }}>
          <a
            href="/todos"
            css={{
              backgroundColor: '#0070f3',
              color: 'white',
              textDecoration: 'none',
              padding: '1rem 2rem',
              borderRadius: '50px',
              fontWeight: '600',
              fontSize: '1.1rem',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 14px rgba(0, 118, 255, 0.39)',
              ':hover': {
                backgroundColor: '#005cc5',
                transform: 'translateY(-5px)',
                boxShadow: '0 6px 20px rgba(0, 118, 255, 0.23)'
              }
            }}
          >
            Try Todos App
          </a>

          <a
            href="/data"
            css={{
              backgroundColor: '#fff',
              color: '#0070f3',
              textDecoration: 'none',
              padding: '1rem 2rem',
              borderRadius: '50px',
              fontWeight: '600',
              fontSize: '1.1rem',
              transition: 'all 0.3s ease',
              border: '2px solid #0070f3',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
              ':hover': {
                backgroundColor: 'rgba(0, 112, 243, 0.05)',
                transform: 'translateY(-5px)',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)'
              }
            }}
          >
            Data Fetching Demo
          </a>

          <a
            href="https://github.com/nitedani/vike-react-rsc"
            target="_blank"
            css={{
              backgroundColor: '#000',
              color: 'white',
              textDecoration: 'none',
              padding: '1rem 2rem',
              borderRadius: '50px',
              fontWeight: '600',
              fontSize: '1.1rem',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
              ':hover': {
                backgroundColor: '#333',
                transform: 'translateY(-5px)',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)'
              }
            }}
          >
            <svg css={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section css={{
        padding: '6rem 0',
        background: 'linear-gradient(180deg, #fff, #f7f7f7)',
        '@media (max-width: 768px)': {
          padding: '4rem 0'
        }
      }}>
        <h2 css={{
          fontSize: '2.5rem',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '3rem',
          color: '#333',
          '@media (max-width: 768px)': {
            fontSize: '2rem',
            marginBottom: '2rem'
          }
        }}>
          Key Features
        </h2>

        <div css={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 1rem',
          '@media (max-width: 768px)': {
            gridTemplateColumns: '1fr'
          }
        }}>
          <div css={{
            padding: '2rem',
            borderRadius: '16px',
            backgroundColor: 'white',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease',
            ':hover': {
              transform: 'translateY(-10px)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
            }
          }}>
            <div css={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              backgroundColor: 'rgba(0, 112, 243, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#0070f3">
                <path d="M13 18h-2v-2h2v2zm2-4h-6v-1h6v1zm2-5v9c0 1.103-.897 2-2 2h-10c-1.103 0-2-.897-2-2v-9c0-1.103.897-2 2-2h10c1.103 0 2 .897 2 2zm-12 0v9h10.001l.001-9h-10.001z"/>
              </svg>
            </div>
            <h3 css={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#333' }}>Server Components</h3>
            <p css={{ color: '#666', lineHeight: 1.7, fontSize: '1.1rem' }}>
              Render components on the server for improved performance and SEO,
              while keeping bundle sizes small.
            </p>
          </div>

          <div css={{
            padding: '2rem',
            borderRadius: '16px',
            backgroundColor: 'white',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease',
            ':hover': {
              transform: 'translateY(-10px)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
            }
          }}>
            <div css={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              backgroundColor: 'rgba(0, 112, 243, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#0070f3">
                <path d="M20.5 11h-2.309c-.228-3.06-2.631-5.463-5.691-5.691v-2.309h-1v2.309c-3.06.228-5.463 2.631-5.691 5.691h-2.309v1h2.309c.228 3.06 2.631 5.463 5.691 5.691v2.309h1v-2.309c3.06-.228 5.463-2.631 5.691-5.691h2.309v-1zm-8.5 6c-3.309 0-6-2.691-6-6s2.691-6 6-6 6 2.691 6 6-2.691 6-6 6zm0-10c-2.206 0-4 1.794-4 4s1.794 4 4 4 4-1.794 4-4-1.794-4-4-4zm0 6c-1.103 0-2-.897-2-2s.897-2 2-2 2 .897 2 2-.897 2-2 2z"/>
              </svg>
            </div>
            <h3 css={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#333' }}>Client Interactivity</h3>
            <p css={{ color: '#666', lineHeight: 1.7, fontSize: '1.1rem' }}>
              Seamlessly mix server and client components to create highly
              interactive applications with optimal performance.
            </p>
          </div>

          <div css={{
            padding: '2rem',
            borderRadius: '16px',
            backgroundColor: 'white',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease',
            ':hover': {
              transform: 'translateY(-10px)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
            }
          }}>
            <div css={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              backgroundColor: 'rgba(0, 112, 243, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#0070f3">
                <path d="M13 5v6h6v2h-6v6h-2v-6h-6v-2h6v-6h2zm-1-5c-5.514 0-10 4.486-10 10s4.486 10 10 10 10-4.486 10-10-4.486-10-10-10zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/>
              </svg>
            </div>
            <h3 css={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#333' }}>Fast Navigation</h3>
            <p css={{ color: '#666', lineHeight: 1.7, fontSize: '1.1rem' }}>
              Enjoy instant page transitions and optimized data loading for
              a smooth user experience.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
