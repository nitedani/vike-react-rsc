"use server";

// Server component that fetches and displays detailed film information
import { filmStyles } from "./styles";

// Define the Film type based on the API response
type Film = {
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

// Server component to fetch and display film details
export async function FilmDetails({ id }: { id: number }) {
  // Fetch the film details from the API
  const response = await fetch(`https://brillout.github.io/star-wars/api/films/${id}.json`);

  // Add a small delay to demonstrate loading state
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Parse the response
  const film: Film = await response.json();

  // Format the opening crawl by replacing \r\n with proper line breaks
  const formattedCrawl = film.opening_crawl.replace(/\\r\\n/g, '\n');

  return (
    <div css={filmStyles.filmDetailsContainer}>
      <h2 css={filmStyles.filmTitle}>
        {film.title}
      </h2>

      <div css={filmStyles.infoGrid}>
        <div>
          <p css={filmStyles.infoLabel}>Director</p>
          <p css={filmStyles.infoValue}>{film.director}</p>
        </div>
        <div>
          <p css={filmStyles.infoLabel}>Producer</p>
          <p css={filmStyles.infoValue}>{film.producer}</p>
        </div>
        <div>
          <p css={filmStyles.infoLabel}>Release Date</p>
          <p css={filmStyles.infoValue}>{film.release_date}</p>
        </div>
      </div>

      <div css={{ marginBottom: '1.5rem' }}>
        <h3 css={filmStyles.sectionTitle}>
          Opening Crawl
        </h3>
        <div css={filmStyles.crawlText}>
          {formattedCrawl}
        </div>
      </div>
    </div>
  );
}
