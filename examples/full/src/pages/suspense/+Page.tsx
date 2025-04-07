import { getPageContext } from "vike-react-rsc/pageContext";
import { sharedStyles } from "../../styles/shared";
import { FilmGrid } from "../../components/Film/FilmGrid";

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

        <div css={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <a href="/todos" css={sharedStyles.backLink}>
            <span css={{ marginRight: '0.5rem' }}>←</span> Tasks App
          </a>

          <a href="/data" css={sharedStyles.backLink}>
            Loading Demo <span css={{ marginLeft: '0.5rem' }}>→</span>
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

        <FilmGrid withDelay={true} />
      </section>

      {/* How It Works Section */}
      <section css={sharedStyles.section}>
        <h2 css={sharedStyles.sectionHeading}>How Suspense Works</h2>
        <p css={sharedStyles.paragraph}>
          React Suspense allows components to "suspend" rendering while they load data.
          This creates a smoother user experience by showing loading states only for the
          specific components that are loading, rather than the entire page.
        </p>
      </section>
    </div>
  );
}
