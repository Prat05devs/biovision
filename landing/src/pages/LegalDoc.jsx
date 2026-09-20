import legal from '../content/legal.json';
import { usePageMeta } from '../usePageMeta';

/**
 * Renders the Privacy Policy or Terms of Use from content/legal.json, which
 * `npm run landing:build` regenerates from the app's src/i18n/en.json.
 */
export default function LegalDoc({ doc, description }) {
  const { title, sections } = legal[doc];

  usePageMeta({
    title: `BioVision — ${title}`,
    description,
    path: `/${doc}`,
  });

  return (
    <div className="doc">
      <p className="eyebrow">BioVision</p>
      <h1>{title}</h1>
      <p className="updated">{legal.updated}</p>
      {sections.map(({ heading, body }) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{body}</p>
        </section>
      ))}
    </div>
  );
}
