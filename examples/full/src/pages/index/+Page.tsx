import Counter from "../../components/Counter";
import { getPageContext } from "vike-react-rsc/pageContext";

type Film = {
  id: number;
  title: string;
};

async function Films() {
  const films = await fetch(
    "https://brillout.github.io/star-wars/api/films.json"
  ).then((res) => res.json() as Promise<Film[]>);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log("Films fetched");

  return (
    <div css={{
      marginTop: '2rem',
      padding: '1.5rem',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <h2 css={{
        fontSize: '1.5rem',
        marginBottom: '1rem',
        color: '#333'
      }}>Star Wars Films</h2>
      <div css={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '1rem'
      }}>
        {films.map((film) => (
          <div
            key={film.id}
            css={{
              padding: '1rem',
              borderRadius: '6px',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
              transition: 'transform 0.2s ease',
              ':hover': {
                transform: 'translateY(-3px)',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
              }
            }}
          >
            {film.title}
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
      {/* Hero Section */}
      <section css={{
        textAlign: 'center',
        padding: '3rem 0',
        marginBottom: '2rem'
      }}>
        <h1 css={{
          fontSize: '3rem',
          fontWeight: 'bold',
          marginBottom: '1.5rem',
          background: 'linear-gradient(90deg, #0070f3, #00a8ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          '@media (max-width: 768px)': {
            fontSize: '2.25rem'
          }
        }}>Vike React Server Components</h1>

        <p css={{
          fontSize: '1.25rem',
          color: '#666',
          maxWidth: '800px',
          margin: '0 auto 2rem',
          lineHeight: 1.6
        }}>
          A powerful framework for building modern React applications with Server Components.
          Enjoy the benefits of server-side rendering with the interactivity of client components.
        </p>

        <div css={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <a
            href="/todos"
            css={{
              backgroundColor: '#0070f3',
              color: 'white',
              textDecoration: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              ':hover': {
                backgroundColor: '#005cc5',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
              }
            }}
          >
            Try Todos App
          </a>

          <a
            href="https://github.com/nitedani/vike-react-rsc"
            target="_blank"
            css={{
              backgroundColor: '#f5f5f5',
              color: '#333',
              textDecoration: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              ':hover': {
                backgroundColor: '#e5e5e5',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
              }
            }}
          >
            View on GitHub
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section css={{ marginBottom: '3rem' }}>
        <h2 css={{
          fontSize: '2rem',
          textAlign: 'center',
          marginBottom: '2rem',
          color: '#333'
        }}>
          Key Features
        </h2>

        <div css={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          '@media (max-width: 768px)': {
            gridTemplateColumns: '1fr'
          }
        }}>
          <div css={{
            padding: '1.5rem',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 css={{ marginBottom: '1rem', color: '#0070f3' }}>Server Components</h3>
            <p css={{ color: '#666', lineHeight: 1.6 }}>
              Render components on the server for improved performance and SEO,
              while keeping bundle sizes small.
            </p>
          </div>

          <div css={{
            padding: '1.5rem',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 css={{ marginBottom: '1rem', color: '#0070f3' }}>Client Interactivity</h3>
            <p css={{ color: '#666', lineHeight: 1.6 }}>
              Seamlessly mix server and client components to create highly
              interactive applications with optimal performance.
            </p>
          </div>

          <div css={{
            padding: '1.5rem',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 css={{ marginBottom: '1rem', color: '#0070f3' }}>Fast Navigation</h3>
            <p css={{ color: '#666', lineHeight: 1.6 }}>
              Enjoy instant page transitions and optimized data loading for
              a smooth user experience.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section css={{ marginBottom: '3rem' }}>
        <h2 css={{
          fontSize: '2rem',
          textAlign: 'center',
          marginBottom: '2rem',
          color: '#333'
        }}>
          Interactive Counter Demo
        </h2>
        <p css={{
          textAlign: 'center',
          marginBottom: '2rem',
          color: '#666',
          maxWidth: '600px',
          margin: '0 auto 2rem'
        }}>
          This counter component runs on the client side. Try clicking the button below!
        </p>

        <Counter />
      </section>

      {/* Server Component Demo */}
      <section>
        <h2 css={{
          fontSize: '2rem',
          textAlign: 'center',
          marginBottom: '2rem',
          color: '#333'
        }}>
          Server Component Demo
        </h2>
        <p css={{
          textAlign: 'center',
          marginBottom: '2rem',
          color: '#666',
          maxWidth: '600px',
          margin: '0 auto 2rem'
        }}>
          This component fetches data on the server. Notice the delay to simulate a real API call.
        </p>

        <Films />
      </section>
    </div>
  );
}
