"use server";

// Server component that fetches and displays detailed movie information

// Define the Movie type based on the API response
type Movie = {
  title: string;
  episode_id: number;
  opening_crawl: string;
  director: string;
  producer: string;
  release_date: string;
  characters: string[];
  planets: string[];
  starships: string[];
  vehicles: string[];
  species: string[];
};

// Server component to fetch and display movie details
export async function MovieDetails({ id }: { id: number }) {
  // Fetch the movie details from the API
  const response = await fetch(`https://brillout.github.io/star-wars/api/films/${id}.json`);

  // Add a small delay to demonstrate loading state
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Parse the response
  const movie: Movie = await response.json();

  // Format the opening crawl by replacing \r\n with proper line breaks
  const formattedCrawl = movie.opening_crawl.replace(/\\r\\n/g, '\n');

  return (
    <div css={{
      padding: '1.5rem',
      borderRadius: '12px',
      backgroundColor: 'white',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
      maxWidth: '800px',
      margin: '0 auto',
      minHeight: '800px', // Ensure consistent height
    }}>
      <div css={{
        marginBottom: '1.5rem',
        borderBottom: '2px solid #0070f3',
        paddingBottom: '0.75rem',
      }}>
        <h2 css={{
          fontSize: '2rem',
          fontWeight: '700',
          color: '#333',
          margin: 0,
          textAlign: 'center',
        }}>
          {movie.title}
        </h2>
      </div>

      <div css={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
        backgroundColor: '#f8f9fa',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid #e9ecef',
      }}>
        <div>
          <h3 css={{ fontSize: '1.1rem', color: '#0070f3', marginBottom: '0.5rem', fontWeight: '500' }}>Director</h3>
          <p css={{ fontSize: '1.2rem', fontWeight: '500' }}>{movie.director}</p>
        </div>
        <div>
          <h3 css={{ fontSize: '1.1rem', color: '#0070f3', marginBottom: '0.5rem', fontWeight: '500' }}>Producer</h3>
          <p css={{ fontSize: '1.2rem', fontWeight: '500' }}>{movie.producer}</p>
        </div>
        <div>
          <h3 css={{ fontSize: '1.1rem', color: '#0070f3', marginBottom: '0.5rem', fontWeight: '500' }}>Release Date</h3>
          <p css={{ fontSize: '1.2rem', fontWeight: '500' }}>
            {new Date(movie.release_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>

      <div css={{ marginBottom: '1.5rem' }}>
        <h3 css={{ fontSize: '1.2rem', color: '#0070f3', marginBottom: '0.75rem', fontWeight: '500' }}>Opening Crawl</h3>
        <div css={{
          backgroundColor: '#f8f9fa',
          color: '#333',
          padding: '1.5rem',
          borderRadius: '8px',
          fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          lineHeight: 1.5,
          whiteSpace: 'pre-line', // Preserve line breaks
          textAlign: 'center',
          fontWeight: '500',
          fontSize: '1rem',
          border: '1px solid #e9ecef',
        }}>
          {formattedCrawl}
        </div>
      </div>


    </div>
  );
}