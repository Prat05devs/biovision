import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ScrollProgress } from './Motion';

/** Scrolls to the top on navigation, or to the #anchor when a link carries one. */
function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return undefined;
    }
    // Wait for layout (images reserve their space) before measuring, or the jump lands short.
    const jump = requestAnimationFrame(() => {
      const target = document.querySelector(hash);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(jump);
  }, [pathname, hash]);

  return null;
}

function Header() {
  return (
    <header className="nav">
      <div className="wrap">
        <Link className="brand" to="/">
          <img src="/assets/logo-mark.svg" alt="" />
          BioVision
        </Link>
        <nav className="nav-links">
          <Link className="hide-sm" to="/#measures">Features</Link>
          <Link className="hide-sm" to="/#how">How it works</Link>
          <Link className="hide-sm" to="/#technology">Technology</Link>
          <NavLink to="/privacy">Privacy</NavLink>
          <NavLink to="/support">Support</NavLink>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site">
      <div className="wrap">
        <div>© {new Date().getFullYear()} BioVision</div>
        <div className="footer-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Use</Link>
          <Link to="/support">Support</Link>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  return (
    <>
      <ScrollManager />
      <ScrollProgress />
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
