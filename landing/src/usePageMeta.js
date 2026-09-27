import { useEffect } from 'react';

const SITE = 'https://biovision.live';

function setTag(selector, attribute, value) {
  const element = document.head.querySelector(selector);
  if (element) element.setAttribute(attribute, value);
}

/** Keeps the title, description and canonical/OG tags correct per route. */
export function usePageMeta({ title, description, path }) {
  useEffect(() => {
    const url = `${SITE}${path}`;
    document.title = title;
    setTag('meta[name="description"]', 'content', description);
    setTag('meta[property="og:title"]', 'content', title);
    setTag('meta[property="og:description"]', 'content', description);
    setTag('meta[property="og:url"]', 'content', url);
    setTag('link[rel="canonical"]', 'href', url);
  }, [title, description, path]);
}
