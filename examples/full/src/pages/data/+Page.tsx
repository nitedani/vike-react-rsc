import { getPageContext } from "vike-react-rsc/pageContext";

type Film = {
  id: number;
  title: string;
  director?: string;
  releaseDate?: string;
  openingCrawl?: string;
};

async function Films() {
  const films = await fetch(
    "https://brillout.github.io/star-wars/api/films.json"
  ).then((res) => res.json() as Promise<Film[]>);
  
  // Simulate a longer loading time to showcase the loading state
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log("Films fetched");

  return (
    <div css={{
      marginTop: '2rem',
      width: '100%'
    }}>
      <div css={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.5rem'
      }}>
        {films.map((film) => (
          <div
            key={film.id}
            css={{
              padding: '1.5rem',
              borderRadius: '16px',
              backgroundColor: 'white',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.3s ease',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              ':hover': {
                transform: 'translateY(-10px)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
              }
            }}
          >
            <h3 css={{ 
              fontSize: '1.5rem', 
              fontWeight: '600', 
              marginBottom: '0.5rem', 
              color: '#333',
              borderBottom: '2px solid #0070f3',
              paddingBottom: '0.5rem'
            }}>{film.title}</h3>
            
            {film.director && (
              <p css={{ 
                color: '#666', 
                marginBottom: '0.5rem',
                fontSize: '0.9rem'
              }}>
                <strong>Director:</strong> {film.director}
              </p>
            )}
            
            {film.releaseDate && (
              <p css={{ 
                color: '#666', 
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                <strong>Released:</strong> {film.releaseDate}
              </p>
            )}
            
            {film.openingCrawl && (
              <p css={{ 
                color: '#666', 
                lineHeight: 1.6,
                fontSize: '0.95rem',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical'
              }}>
                {film.openingCrawl}
              </p>
            )}
            
            <div css={{
              marginTop: 'auto',
              paddingTop: '1rem'
            }}>
              <button css={{
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
              }}>
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function Page() {
  const ctx = getPageContext();
  console.log(ctx.pageId);

  return (
    <div css={{ width: '100%', overflowX: 'hidden' }}>
      {/* Header Section */}
      <section css={{
        textAlign: 'center',
        marginBottom: '3rem'
      }}>
        <h1 css={{
          fontSize: '3rem',
          fontWeight: '700',
          marginBottom: '1.5rem',
          background: 'linear-gradient(90deg, #0070f3, #00c6ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          '@media (max-width: 768px)': {
            fontSize: '2.25rem'
          }
        }}>Server Data Fetching</h1>
        
        <p css={{
          fontSize: '1.25rem',
          color: '#666',
          maxWidth: '800px',
          margin: '0 auto 2rem',
          lineHeight: 1.6
        }}>
          This page demonstrates server components fetching data with a loading state.
          The data is fetched on the server with a simulated delay to showcase the loading experience.
        </p>
        
        <div css={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <a
            href="/"
            css={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#0070f3',
              textDecoration: 'none',
              fontSize: '1.1rem',
              fontWeight: '500',
              ':hover': {
                textDecoration: 'underline'
              }
            }}
          >
            <span css={{ marginRight: '0.5rem' }}>←</span> Back to Home
          </a>
        </div>
      </section>

      {/* Server Component Demo */}
      <section css={{
        padding: '2rem',
        borderRadius: '16px',
        backgroundColor: '#f9f9f9',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
        marginBottom: '3rem'
      }}>
        <h2 css={{
          fontSize: '2rem',
          marginBottom: '1.5rem',
          color: '#333',
          textAlign: 'center'
        }}>
          Star Wars Films
        </h2>
        <p css={{
          textAlign: 'center',
          marginBottom: '2rem',
          color: '#666',
          maxWidth: '600px',
          margin: '0 auto 2rem'
        }}>
          This component fetches data on the server with a 3-second delay to simulate a real API call.
          Notice how the loading state is shown while data is being fetched.
        </p>
        
        <Films />
      </section>

      {/* How It Works Section */}
      <section css={{
        padding: '3rem 2rem',
        borderRadius: '16px',
        backgroundColor: 'white',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
        marginBottom: '3rem'
      }}>
        <h2 css={{
          fontSize: '2rem',
          marginBottom: '1.5rem',
          color: '#333',
          textAlign: 'center'
        }}>
          How It Works
        </h2>
        
        <div css={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          <div css={{
            padding: '1.5rem',
            borderRadius: '12px',
            backgroundColor: '#f9f9f9',
            textAlign: 'center'
          }}>
            <div css={{
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
            }}>1</div>
            <h3 css={{ marginBottom: '1rem', color: '#333' }}>Server Fetching</h3>
            <p css={{ color: '#666', lineHeight: 1.6 }}>
              Data is fetched directly on the server, not in the browser
            </p>
          </div>
          
          <div css={{
            padding: '1.5rem',
            borderRadius: '12px',
            backgroundColor: '#f9f9f9',
            textAlign: 'center'
          }}>
            <div css={{
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
            }}>2</div>
            <h3 css={{ marginBottom: '1rem', color: '#333' }}>Loading UI</h3>
            <p css={{ color: '#666', lineHeight: 1.6 }}>
              A loading state is shown while data is being fetched
            </p>
          </div>
          
          <div css={{
            padding: '1.5rem',
            borderRadius: '12px',
            backgroundColor: '#f9f9f9',
            textAlign: 'center'
          }}>
            <div css={{
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
            }}>3</div>
            <h3 css={{ marginBottom: '1rem', color: '#333' }}>Streaming</h3>
            <p css={{ color: '#666', lineHeight: 1.6 }}>
              Content is streamed to the client as it becomes available
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
