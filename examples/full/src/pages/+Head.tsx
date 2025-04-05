export function Head() {
    return (
      <>
        <title>Vike React Server Components</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            box-sizing: border-box;
            height: 100%;
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