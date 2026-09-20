import { Link } from 'react-router-dom';
import { usePageMeta } from '../usePageMeta';

export default function NotFound() {
  usePageMeta({
    title: 'BioVision — Page not found',
    description: 'That page does not exist on biovision.live.',
    path: '/404',
  });

  return (
    <div className="wrap not-found">
      <p className="eyebrow">404</p>
      <h1>We could not find that page</h1>
      <p className="section-lead" style={{ margin: '0 auto 28px' }}>
        The link may be out of date. Try the home page, or the support page if you were looking for
        help with the app.
      </p>
      <div className="hero-cta" style={{ justifyContent: 'center' }}>
        <Link className="button primary" to="/">Go to the home page</Link>
        <Link className="button secondary" to="/support">Support</Link>
      </div>
    </div>
  );
}
