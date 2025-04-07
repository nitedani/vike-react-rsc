export function Head() {
    return (
      <>
        <title>Vike React Server Components</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/vike.svg" type="image/svg+xml" />
        <meta name="description" content="A demo of Vike with React Server Components" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            box-sizing: border-box;
            height: 100%;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }

          * {
            box-sizing: border-box;
          }

          /* Fix for mobile browsers and their inconsistent viewport height handling */
          @supports (-webkit-touch-callout: none) {
            .min-h-screen {
              min-height: -webkit-fill-available;
            }
          }
        `}} />
      </>
    );
  }