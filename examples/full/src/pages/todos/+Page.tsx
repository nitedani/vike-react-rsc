import { getPageContext } from "vike-react-rsc/pageContext";
import { getTodos } from "../../actions/addTodo";
import { Todos } from "../../components/Todos";

export async function Page() {
  const todos = await getTodos();
  const ctx = getPageContext();
  console.log(ctx.pageId);

  return (
    <div css={{ width: '100%', overflowX: 'hidden' }}>
      {/* Header Section */}
      <section css={{
        textAlign: 'center',
        marginBottom: '2.5rem'
      }}>
        <h1 css={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          color: '#0070f3'
        }}>Todo List</h1>

        <p css={{
          fontSize: '1.1rem',
          color: '#666',
          maxWidth: '600px',
          margin: '0 auto 1.5rem',
          lineHeight: 1.5
        }}>
          A simple todo application built with Vike React Server Components.
          Add, view, and manage your tasks with ease.
        </p>

        <a
          href="/"
          css={{
            display: 'inline-flex',
            alignItems: 'center',
            color: '#0070f3',
            textDecoration: 'none',
            fontSize: '1rem',
            ':hover': {
              textDecoration: 'underline'
            }
          }}
        >
          <span css={{ marginRight: '0.5rem' }}>←</span> Back to Home
        </a>
      </section>

      {/* Todo App Section */}
      <section>
        <Todos todos={todos} />
      </section>

      {/* Info Section */}
      <section css={{
        marginTop: '3rem',
        textAlign: 'center',
        padding: '1.5rem',
        borderRadius: '8px',
        backgroundColor: '#f5f5f5',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h2 css={{
          fontSize: '1.25rem',
          marginBottom: '1rem',
          color: '#333'
        }}>How It Works</h2>

        <p css={{
          color: '#666',
          lineHeight: 1.5,
          marginBottom: '1rem'
        }}>
          This todo app demonstrates React Server Components in action.
          When you add a todo, it uses a server action to update the list without a full page reload.
        </p>

        <div css={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div css={{
            backgroundColor: 'white',
            padding: '0.75rem',
            borderRadius: '4px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            fontSize: '0.9rem',
            color: '#666'
          }}>
            <strong css={{ color: '#0070f3' }}>Server Components</strong> for data fetching
          </div>

          <div css={{
            backgroundColor: 'white',
            padding: '0.75rem',
            borderRadius: '4px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            fontSize: '0.9rem',
            color: '#666'
          }}>
            <strong css={{ color: '#0070f3' }}>Client Components</strong> for interactivity
          </div>

          <div css={{
            backgroundColor: 'white',
            padding: '0.75rem',
            borderRadius: '4px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            fontSize: '0.9rem',
            color: '#666'
          }}>
            <strong css={{ color: '#0070f3' }}>Server Actions</strong> for mutations
          </div>
        </div>
      </section>
    </div>
  );
}
