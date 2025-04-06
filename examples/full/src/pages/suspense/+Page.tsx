import { Suspense } from "react";
import { getPageContext } from "vike-react-rsc/pageContext";
import { sharedStyles } from "../../styles/shared";

// Use shared styles for consistency

type Film = {
  id: number;
  title: string;
  director?: string;
  releaseDate?: string;
  openingCrawl?: string;
};

// Component to fetch and display a single film
async function FilmCard({ id }: { id: number }) {
  // Fetch a single film with artificial delay
  const films = await fetch(
    "https://brillout.github.io/star-wars/api/films.json"
  ).then((res) => res.json() as Promise<Film[]>);

  // Find the specific film
  const film = films.find(f => f.id === id);

  // Add a delay based on the film ID to demonstrate staggered loading
  await new Promise(resolve => setTimeout(resolve, id * 1000));

  if (!film) {
    return <div>Film not found</div>;
  }

  return (
    <div css={sharedStyles.card}>
      <h3 css={sharedStyles.cardTitle}>{film.title}</h3>

      {film.director && (
        <p css={sharedStyles.cardMetadata}>
          <strong>Director:</strong> {film.director}
        </p>
      )}

      {film.releaseDate && (
        <p css={sharedStyles.cardMetadata}>
          <strong>Released:</strong> {film.releaseDate}
        </p>
      )}

      {film.openingCrawl && (
        <p css={sharedStyles.cardDescription}>
          {film.openingCrawl}
        </p>
      )}

      <div css={sharedStyles.cardButtonContainer}>
        <button css={sharedStyles.cardButton}>
          View Details
        </button>
      </div>
    </div>
  );
}

// Component to fetch all film IDs
async function FilmIds() {
  // Fetch all films to get their IDs
  const films = await fetch(
    "https://brillout.github.io/star-wars/api/films.json"
  ).then((res) => res.json() as Promise<Film[]>);

  return films.map(film => film.id);
}

// Loading fallback component that matches the exact dimensions of the real component
function CardSkeleton() {
  return (
    <div css={{
      ...sharedStyles.card,
      backgroundColor: '#f9f9f9',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
      animation: 'pulse 1.5s infinite ease-in-out',
      '@keyframes pulse': {
        '0%': { opacity: 0.7 },
        '50%': { opacity: 0.9 },
        '100%': { opacity: 0.7 }
      },
      ':hover': {
        transform: 'none',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
      }
    }}>
      {/* Title placeholder */}
      <div css={{
        height: '38px', // Matches the title height + border + padding
        width: '80%',
        backgroundColor: '#eaeaea',
        borderRadius: '4px',
        marginBottom: '0.5rem'
      }} />

      {/* Director placeholder */}
      <div css={{
        height: '16px',
        width: '60%',
        backgroundColor: '#eaeaea',
        borderRadius: '4px',
        marginBottom: '0.5rem'
      }} />

      {/* Release date placeholder */}
      <div css={{
        height: '26px',
        width: '40%',
        backgroundColor: '#eaeaea',
        borderRadius: '4px',
        marginBottom: '1rem'
      }} />

      {/* Button placeholder */}
      <div css={sharedStyles.cardButtonContainer}>
        <div css={{
          height: '38px',
          width: '120px',
          backgroundColor: '#eaeaea',
          borderRadius: '50px'
        }} />
      </div>
    </div>
  );
}

// Component to display all films with individual Suspense boundaries
function FilmGrid() {
  return (
    <div css={{
      minHeight: '200px',
      width: '100%',
    }}>
      <Suspense fallback={
        <div css={{
          padding: '2rem',
          textAlign: 'center',
          color: '#666',
          fontSize: '1.1rem'
        }}>
          Loading film list...
        </div>
      }>
        <FilmGridInner />
      </Suspense>
    </div>
  );
}

// Inner component that depends on FilmIds
async function FilmGridInner() {
  const filmIds = await FilmIds();

  return (
    <div css={sharedStyles.cardGrid}>
      {filmIds.map(id => (
        <div key={id} css={{ height: '100%', display: 'flex' }}>
          <Suspense fallback={<CardSkeleton />}>
            <FilmCard id={id} />
          </Suspense>
        </div>
      ))}
    </div>
  );
}

export default async function Page() {
  const ctx = getPageContext();
  console.log(ctx.pageId);

  return (
    <div css={sharedStyles.pageContainer}>
      {/* Header Section */}
      <section css={sharedStyles.headerSection}>
        <h1 css={sharedStyles.mainHeading}>Component-Level Suspense</h1>

        <p css={sharedStyles.paragraph}>
          This page demonstrates React's Suspense feature with component-level loading states.
          Each part of the page can load independently without blocking the rest of the content.
        </p>

        <div css={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <a href="/" css={sharedStyles.backLink}>
            <span css={{ marginRight: '0.5rem' }}>←</span> Back to Home
          </a>
        </div>
      </section>

      {/* Suspense Demo Section */}
      <section css={{
        ...sharedStyles.section,
        backgroundColor: '#f9f9f9'
      }}>
        <h2 css={sharedStyles.sectionHeading}>Star Wars Films</h2>
        <p css={sharedStyles.paragraph}>
          Each film card below has its own loading state with a skeleton placeholder.
          The staggered loading (1-6 seconds) demonstrates how Suspense boundaries work at the component level.
          Content appears progressively as it becomes available.
        </p>

        <FilmGrid />
      </section>

      {/* How It Works Section */}
      <section css={sharedStyles.section}>
        <h2 css={sharedStyles.sectionHeading}>How Suspense Works</h2>

        <div css={sharedStyles.featureGrid}>
          {/* Feature 1 */}
          <div css={sharedStyles.featureCard}>
            <div css={sharedStyles.featureNumber}>1</div>
            <h3 css={sharedStyles.featureHeading}>Server-Side Suspense</h3>
            <p css={sharedStyles.featureParagraph}>
              When the page loads, the server starts rendering components. When a component suspends
              (like the film cards fetching data), the server shows a fallback while continuing to process.
            </p>
          </div>

          {/* Feature 2 */}
          <div css={sharedStyles.featureCard}>
            <div css={sharedStyles.featureNumber}>2</div>
            <h3 css={sharedStyles.featureHeading}>RSC Streaming</h3>
            <p css={sharedStyles.featureParagraph}>
              As each film's data resolves on the server, it sends that component's data to the client via
              the RSC protocol. The client then updates just that part of the page with the real content.
            </p>
          </div>

          {/* Feature 3 */}
          <div css={sharedStyles.featureCard}>
            <div css={sharedStyles.featureNumber}>3</div>
            <h3 css={sharedStyles.featureHeading}>Selective Hydration</h3>
            <p css={sharedStyles.featureParagraph}>
              Each film card is processed independently. This allows the page to show content progressively
              as it becomes available, rather than waiting for all data to load at once.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
