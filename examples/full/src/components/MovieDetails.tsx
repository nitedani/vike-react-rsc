"use server";

// Server component that fetches and displays detailed movie information
import { sharedStyles } from "../styles/shared";

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

  console.log("hello world");
  
  // Add a small delay to demonstrate loading state
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Parse the response
  const movie: Movie = await response.json();

  // Format the opening crawl by replacing \r\n with proper line breaks
  const formattedCrawl = movie.opening_crawl.replace(/\\r\\n/g, '\n');

  return (
    <div css={{
      padding: '2rem',
      borderRadius: '16px',
      backgroundColor: '#f9f9f9',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
      maxWidth: '800px',
      margin: '0 auto',
    }}>
      <div css={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        borderBottom: '2px solid #0070f3',
        paddingBottom: '1rem',
      }}>
        <h2 css={{
          fontSize: '2rem',
          fontWeight: '700',
          color: '#333',
          margin: 0,
        }}>
          {movie.title}
        </h2>
        <div css={{
          backgroundColor: '#0070f3',
          color: 'white',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          fontWeight: 'bold',
        }}>
          {movie.episode_id}
        </div>
      </div>

      <div css={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <div>
          <h3 css={{ fontSize: '1.1rem', color: '#666', marginBottom: '0.5rem' }}>Director</h3>
          <p css={{ fontSize: '1.2rem', fontWeight: '500' }}>{movie.director}</p>
        </div>
        <div>
          <h3 css={{ fontSize: '1.1rem', color: '#666', marginBottom: '0.5rem' }}>Producer</h3>
          <p css={{ fontSize: '1.2rem', fontWeight: '500' }}>{movie.producer}</p>
        </div>
        <div>
          <h3 css={{ fontSize: '1.1rem', color: '#666', marginBottom: '0.5rem' }}>Release Date</h3>
          <p css={{ fontSize: '1.2rem', fontWeight: '500' }}>
            {new Date(movie.release_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>

      <div css={{ marginBottom: '2rem' }}>
        <h3 css={{ fontSize: '1.3rem', color: '#333', marginBottom: '1rem' }}>Opening Crawl</h3>
        <div css={{
          backgroundColor: 'black',
          color: '#FFE81F', // Star Wars yellow
          padding: '2rem',
          borderRadius: '8px',
          fontFamily: 'monospace',
          lineHeight: 1.6,
          whiteSpace: 'pre-line', // Preserve line breaks
          textAlign: 'center',
          fontWeight: '500',
          fontSize: '1.1rem',
        }}>
          {formattedCrawl}
        </div>
      </div>

      <div css={sharedStyles.cardButtonContainer}>
        <a href="/suspense" css={{
          ...sharedStyles.cardButton,
          textDecoration: 'none',
          display: 'inline-block',
        }}>
          Back to Movies
        </a>
      </div>
    </div>
  );
}