import { Link } from 'react-router-dom';
import { usePageMeta } from '../usePageMeta';

const SUPPORT_EMAIL = 'admin@wtsolutions.cc';
const TESTFLIGHT_URL = 'https://testflight.apple.com/join/46brVNQj';

const faqs = [
  {
    id: 'testflight',
    q: 'How do I get the iPhone app?',
    a: "BioVision is in open beta on TestFlight. Install Apple's free TestFlight app from the App Store, then open the invitation link below on your iPhone and tap Install.",
    external: { href: TESTFLIGHT_URL, label: 'Open the TestFlight invitation' },
  },
  {
    q: 'Which iPhones are supported?',
    a: 'Any iPhone running iOS 16.4 or later with a front camera. The scan works best on iPhone 11 or newer.',
  },
  {
    q: 'The scan says "We couldn\'t read a clear pulse"',
    a: 'Face a window or bright, even light, rest your phone on a table at eye level, remove glasses if possible, and keep your head still for the full 30 seconds.',
  },
  {
    q: 'The eye photo was rejected',
    a: 'Gently pull down your lower eyelid so the inner pink area is clearly visible, avoid flash and glare, and hold the phone steady until the photo is sharp.',
  },
  {
    q: 'Is my data uploaded?',
    a: 'No. The camera video, photos and your answers are analysed on your iPhone and are not uploaded or stored.',
    link: { to: '/privacy', label: 'See the Privacy Policy.' },
  },
  {
    q: 'How accurate are the results?',
    a: 'Results are estimates and can be affected by light, movement, make-up and camera quality. Haemoglobin is estimated from eyelid colour, not a blood test. Always confirm important results with a doctor or laboratory test.',
  },
  {
    q: 'Can I change the language?',
    a: 'Yes. Open Settings (the gear icon on the home screen) and choose English or Hindi.',
  },
  {
    q: 'This is an emergency',
    a: 'Do not use the app. Call 112 now. For mental-health crisis support, call Tele-MANAS on 14416.',
  },
];

export default function Support() {
  usePageMeta({
    title: 'BioVision — Support',
    description: 'Answers to common questions about the BioVision health pre-screening app, and how to reach the team.',
    path: '/support',
  });

  return (
    <div className="doc">
      <p className="eyebrow">Support</p>
      <h1>How can we help?</h1>
      <p className="intro">
        Answers to the questions we are asked most about BioVision. Still stuck? Email{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we usually reply within two
        working days.
      </p>

      <div className="faq">
        {faqs.map(({ id, q, a, link, external }) => (
          <details key={q} id={id} open={id === 'testflight'}>
            <summary>{q}</summary>
            <p>
              {a}
              {link ? <> <Link to={link.to}>{link.label}</Link></> : null}
            </p>
            {external ? (
              <a className="button primary faq-cta" href={external.href} target="_blank" rel="noreferrer">
                {external.label}
              </a>
            ) : null}
          </details>
        ))}
      </div>

      <div className="contact-card">
        <h2>Still need a hand?</h2>
        <p>
          Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Tell us your iPhone
          model and iOS version, and what happened just before the problem — it helps us answer in
          one reply.
        </p>
      </div>

      <p className="notice caution" style={{ marginTop: 28 }}>
        In an emergency do not wait for a reply. Call 112, or Tele-MANAS on 14416 for mental-health
        crisis support.
      </p>
    </div>
  );
}
