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
        marginBottom: '3rem'
      }}>
        <h1 css={{
          fontSize: '3rem',
          fontWeight: '700',
          marginBottom: '1.5rem',
          background: 'linear-gradient(90deg, #0070f3, #00c6ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          '@media (max-width: 768px)': {
            fontSize: '2.25rem'
          }
        }}>Task Manager</h1>

        <p css={{
          fontSize: '1.25rem',
          color: '#666',
          maxWidth: '700px',
          margin: '0 auto 2rem',
          lineHeight: 1.6
        }}>
          A powerful todo application built with Vike React Server Components.
          Add, complete, and delete tasks with a modern, responsive interface.
        </p>

        <div css={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <a
            href="/"
            css={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#0070f3',
              textDecoration: 'none',
              fontSize: '1.1rem',
              fontWeight: '500',
              padding: '0.5rem 1rem',
              borderRadius: '50px',
              transition: 'all 0.3s ease',
              ':hover': {
                backgroundColor: 'rgba(0, 112, 243, 0.05)',
                transform: 'translateY(-2px)'
              }
            }}
          >
            <span css={{ marginRight: '0.5rem' }}>←</span> Back to Home
          </a>

          <a
            href="/data"
            css={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#0070f3',
              textDecoration: 'none',
              fontSize: '1.1rem',
              fontWeight: '500',
              padding: '0.5rem 1rem',
              borderRadius: '50px',
              transition: 'all 0.3s ease',
              ':hover': {
                backgroundColor: 'rgba(0, 112, 243, 0.05)',
                transform: 'translateY(-2px)'
              }
            }}
          >
            Data Fetching Demo <span css={{ marginLeft: '0.5rem' }}>→</span>
          </a>
        </div>
      </section>

      {/* Todo App Section */}
      <section>
        <Todos todos={todos} />
      </section>

      {/* Info Section */}
      <section css={{
        marginTop: '4rem',
        textAlign: 'center',
        padding: '3rem 2rem',
        borderRadius: '16px',
        background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
        boxShadow: '20px 20px 60px #d9d9d9, -20px -20px 60px #ffffff',
        maxWidth: '900px',
        margin: '0 auto 3rem',
        '@media (max-width: 768px)': {
          padding: '2rem 1.5rem'
        }
      }}>
        <h2 css={{
          fontSize: '2rem',
          fontWeight: '700',
          marginBottom: '1.5rem',
          color: '#333'
        }}>How It Works</h2>

        <p css={{
          color: '#666',
          lineHeight: 1.6,
          fontSize: '1.1rem',
          marginBottom: '2rem',
          maxWidth: '700px',
          margin: '0 auto 2rem'
        }}>
          This task manager demonstrates React Server Components in action.
          When you interact with tasks, it uses server actions to update the list without a full page reload.
        </p>

        <div css={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          '@media (max-width: 768px)': {
            gridTemplateColumns: '1fr'
          }
        }}>
          <div css={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease',
            ':hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)'
            }
          }}>
            <div css={{
              width: '50px',
              height: '50px',
              borderRadius: '10px',
              backgroundColor: 'rgba(0, 112, 243, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#0070f3">
                <path d="M13 18h-2v-2h2v2zm2-4h-6v-1h6v1zm2-5v9c0 1.103-.897 2-2 2h-10c-1.103 0-2-.897-2-2v-9c0-1.103.897-2 2-2h10c1.103 0 2 .897 2 2zm-12 0v9h10.001l.001-9h-10.001z"/>
              </svg>
            </div>
            <h3 css={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>Server Components</h3>
            <p css={{ color: '#666', lineHeight: 1.6 }}>
              Render components on the server for improved performance and SEO
            </p>
          </div>

          <div css={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease',
            ':hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)'
            }
          }}>
            <div css={{
              width: '50px',
              height: '50px',
              borderRadius: '10px',
              backgroundColor: 'rgba(0, 112, 243, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#0070f3">
                <path d="M20.5 11h-2.309c-.228-3.06-2.631-5.463-5.691-5.691v-2.309h-1v2.309c-3.06.228-5.463 2.631-5.691 5.691h-2.309v1h2.309c.228 3.06 2.631 5.463 5.691 5.691v2.309h1v-2.309c3.06-.228 5.463-2.631 5.691-5.691h2.309v-1zm-8.5 6c-3.309 0-6-2.691-6-6s2.691-6 6-6 6 2.691 6 6-2.691 6-6 6z"/>
              </svg>
            </div>
            <h3 css={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>Client Interactivity</h3>
            <p css={{ color: '#666', lineHeight: 1.6 }}>
              Add client-side interactivity for a responsive user experience
            </p>
          </div>

          <div css={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease',
            ':hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)'
            }
          }}>
            <div css={{
              width: '50px',
              height: '50px',
              borderRadius: '10px',
              backgroundColor: 'rgba(0, 112, 243, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#0070f3">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
              </svg>
            </div>
            <h3 css={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>Server Actions</h3>
            <p css={{ color: '#666', lineHeight: 1.6 }}>
              Update data on the server without full page reloads
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
