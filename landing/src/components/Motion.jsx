import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Adds `is-visible` once the element scrolls into view, so CSS can run the entrance. */
export function Reveal({ children, className = '', delay = 0, as: Tag = 'div', ...rest }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
    );
    observer.observe(node);
    // Safety net: never leave content invisible if the observer does not report (e.g. a deep link
    // that lands mid-page before layout settles).
    const failsafe = setTimeout(() => setVisible(true), 1200);
    return () => {
      observer.disconnect();
      clearTimeout(failsafe);
    };
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Counts up to `value` the first time it is seen. Falls back to the final number without motion. */
export function Counter({ value, decimals = 0, duration = 1400, prefix = '', suffix = '' }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      setDisplay(value);
      return undefined;
    }
    let frame;
    let settle;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const progress = Math.min(1, (now - start) / duration);
          // Ease-out cubic, so the number settles rather than stopping dead.
          setDisplay(value * (1 - (1 - progress) ** 3));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        // Guarantee the final figure even where rAF is throttled (background tabs, screenshots).
        settle = setTimeout(() => setDisplay(value), duration + 250);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      if (settle) clearTimeout(settle);
    };
  }, [value, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Thin progress bar under the header showing how far down the page the reader is. */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return <div className="scroll-progress" style={{ transform: `scaleX(${progress / 100})` }} aria-hidden="true" />;
}

/** Looping pulse trace, drawn to look like the waveform the app shows while scanning. */
export function PulseWave({ className = '' }) {
  const beat = 'M0 30 L18 30 L24 22 L30 44 L36 8 L42 38 L48 30 L70 30';
  // Eight beats across a 420-wide window: translating one 70px beat loops without a seam.
  const path = Array.from({ length: 8 }, (_, i) =>
    beat.replace(/(\d+(?:\.\d+)?) (\d+)/g, (m, x, y) => `${Number(x) + i * 70} ${y}`),
  ).join(' ');

  return (
    <svg className={`pulse-wave ${className}`.trim()} viewBox="0 0 420 60" fill="none" aria-hidden="true" preserveAspectRatio="none">
      <path d={path} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Horizontally scrolling row of chips. Duplicated once so the loop has no visible seam. */
export function Marquee({ items }) {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {[...items, ...items].map((item, index) => (
          <span className="chip" key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}
