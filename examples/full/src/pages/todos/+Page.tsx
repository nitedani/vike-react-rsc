import { getTodos } from "../../actions/addTodo";
import { Todos } from "../../components/Todos";
import { sharedStyles } from "../../styles/shared";

export async function Page() {
  const todos = await getTodos();
  return (
    <div css={sharedStyles.pageContainer}>
      {/* Header Section */}
      <section css={sharedStyles.headerSection}>
        <h1 css={sharedStyles.mainHeading}>Task Manager</h1>

        <p css={sharedStyles.paragraph}>
          A powerful todo application built with Vike React Server Components.
          Add, complete, and delete tasks with a modern, responsive interface.
        </p>

        <div css={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <a
            href="/"
            css={sharedStyles.backLink}
          >
            <span css={{ marginRight: '0.5rem' }}>←</span> Back to Home
          </a>

          <a
            href="/suspense"
            css={sharedStyles.backLink}
          >
            Suspense Demo <span css={{ marginLeft: '0.5rem' }}>→</span>
          </a>
        </div>
      </section>

      {/* Todo App Section */}
      <section css={{
        position: 'relative',
        zIndex: 2,
        marginBottom: '3rem'
      }}>
        <Todos todos={todos} />
      </section>

      {/* Info Section */}
      <section css={{
        ...sharedStyles.section,
        position: 'relative',
        zIndex: 1
      }}>
        <h2 css={sharedStyles.sectionHeading}>How It Works</h2>

        <p css={sharedStyles.paragraph}>
          This task manager demonstrates React Server Components in action.
          Here's what happens when you interact with the app:
        </p>

        <div css={sharedStyles.featureGrid}>
          <div css={sharedStyles.featureCard}>
            <div css={sharedStyles.featureNumber}>1</div>
            <h3 css={sharedStyles.featureHeading}>Adding a Task</h3>
            <p css={sharedStyles.featureParagraph}>
              When you type a task and click "Add", the client sends a request to the server action.
              The server executes the action, updates the data, calls the <code>rerender()</code> function,
              and sends back a new RSC payload with the updated UI.
            </p>
          </div>

          <div css={sharedStyles.featureCard}>
            <div css={sharedStyles.featureNumber}>2</div>
            <h3 css={sharedStyles.featureHeading}>Server Actions with Rerender</h3>
            <p css={sharedStyles.featureParagraph}>
              Each todo action (add, toggle, delete) explicitly calls <code>rerender()</code> to update the UI.
              Without this call, the server would return only the action result without re-rendering the page.
            </p>
          </div>

          <div css={sharedStyles.featureCard}>
            <div css={sharedStyles.featureNumber}>3</div>
            <h3 css={sharedStyles.featureHeading}>RSC Payload Caching</h3>
            <p css={sharedStyles.featureParagraph}>
              The app uses client-side caching of RSC payloads based on the <code>staleTime</code> configuration.
              This reduces server load by reusing cached payloads during navigation when they're still fresh.
            </p>
          </div>
        </div>
      </section>


    </div>
  );
}
