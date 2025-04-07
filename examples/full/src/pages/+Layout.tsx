import MobileMenuClient from '../components/MobileMenuClient';
import { layoutStyles } from '../styles/layout';
import { getPageContext } from 'vike-react-rsc/pageContext';

import '../styles/global.css';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { urlPathname } = getPageContext();
  
  // Helper function to determine if a link is active
  const isActive = (path: string) => urlPathname === path;
  
  return (
    <div css={layoutStyles.container}>
      <header css={layoutStyles.header}>
        <div css={layoutStyles.logo}>
          <a href="/" css={layoutStyles.logoLink}>Vike RSC</a>
        </div>

        <MobileMenuClient>
          <nav css={layoutStyles.nav}>
            <a 
              href="/" 
              css={[layoutStyles.navLink, isActive('/') && layoutStyles.activeNavLink]}
            >
              Home
            </a>
            <a 
              href="/todos" 
              css={[layoutStyles.navLink, isActive('/todos') && layoutStyles.activeNavLink]}
            >
              Tasks
            </a>
            <a 
              href="/suspense" 
              css={[layoutStyles.navLink, isActive('/suspense') && layoutStyles.activeNavLink]}
            >
              Suspense
            </a>
            <a 
              href="/data" 
              css={[layoutStyles.navLink, isActive('/data') && layoutStyles.activeNavLink]}
            >
              Loading
            </a>
            <a 
              href="https://github.com/nitedani/vike-react-rsc" 
              target="_blank" 
              css={layoutStyles.navLink}
            >
              GitHub
            </a>
          </nav>
        </MobileMenuClient>
      </header>

      <main css={layoutStyles.main}>
        {children}
      </main>

      <footer css={layoutStyles.footer}>
        <p>Vike React Server Components Demo</p>
      </footer>
    </div>
  );
}
