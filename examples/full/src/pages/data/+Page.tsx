import { getPageContext } from "vike-react-rsc/pageContext";
import { sharedStyles } from "../../styles/shared";

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
      <div css={sharedStyles.cardGrid}>
        {films.map((film) => (
          <div
            key={film.id}
            css={sharedStyles.card}
          >
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
        ))}
      </div>
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
        <h1 css={sharedStyles.mainHeading}>Page-Level Loading</h1>

        <p css={sharedStyles.paragraph}>
          This page demonstrates the page-level loading state using the +Loading.tsx file.
          Unlike component-level Suspense, this shows a loading state for the entire page.
        </p>

        <div css={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <a href="/" css={sharedStyles.backLink}>
            <span css={{ marginRight: '0.5rem' }}>←</span> Back to Home
          </a>
        </div>
      </section>

      {/* Server Component Demo */}
      <section css={{
        ...sharedStyles.section,
        backgroundColor: '#f9f9f9'
      }}>
        <h2 css={sharedStyles.sectionHeading}>
          Star Wars Films
        </h2>
        <p css={sharedStyles.paragraph}>
          This component fetches data on the server with a 2-second delay.
          The entire page shows a loading state while waiting for all data.
        </p>

        <Films />
      </section>

      {/* How It Works Section */}
      <section css={sharedStyles.section}>
        <h2 css={sharedStyles.sectionHeading}>
          How It Works
        </h2>

        <div css={sharedStyles.featureGrid}>
          <div css={sharedStyles.featureCard}>
            <div css={sharedStyles.featureNumber}>1</div>
            <h3 css={sharedStyles.featureHeading}>Page-Level Loading</h3>
            <p css={sharedStyles.featureParagraph}>
              When you navigate to this page, Vike detects the data fetching and shows the +Loading.tsx
              component while the server processes the page. This is different from component-level Suspense.
            </p>
          </div>

          <div css={sharedStyles.featureCard}>
            <div css={sharedStyles.featureNumber}>2</div>
            <h3 css={sharedStyles.featureHeading}>Server Rendering</h3>
            <p css={sharedStyles.featureParagraph}>
              The server fetches all data (with a 2-second delay) before rendering any part of the page.
              Only when all data is ready does the server send the complete RSC payload to the client.
            </p>
          </div>

          <div css={sharedStyles.featureCard}>
            <div css={sharedStyles.featureNumber}>3</div>
            <h3 css={sharedStyles.featureHeading}>Implementation</h3>
            <p css={sharedStyles.featureParagraph}>
              This pattern is implemented by creating a +Loading.tsx file in the same directory as the
              +Page.tsx file. Vike automatically uses it during page loading.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
