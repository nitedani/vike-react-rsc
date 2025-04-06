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
            href="/data"
            css={sharedStyles.backLink}
          >
            Data Fetching Demo <span css={{ marginLeft: '0.5rem' }}>→</span>
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
              The server executes the action, updates the data, re-renders the page, and sends back a new RSC payload.
            </p>
          </div>

          <div css={sharedStyles.featureCard}>
            <div css={sharedStyles.featureNumber}>2</div>
            <h3 css={sharedStyles.featureHeading}>Completing a Task</h3>
            <p css={sharedStyles.featureParagraph}>
              Clicking the checkbox sends a request to the server. While waiting for the response,
              the client shows a loading indicator. The server updates the task and sends a new RSC payload.
            </p>
          </div>

          <div css={sharedStyles.featureCard}>
            <div css={sharedStyles.featureNumber}>3</div>
            <h3 css={sharedStyles.featureHeading}>Deleting a Task</h3>
            <p css={sharedStyles.featureParagraph}>
              The delete button triggers a server action request. The client shows a loading state
              while the server processes the deletion and returns a new RSC payload with the updated list.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
