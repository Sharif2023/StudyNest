import React, { useEffect, useRef, useState } from "react";

export function classNames(...cls) {
  return cls.filter(Boolean).join(" ");
}

export function useCountUp({ target = 2000000, duration = 1800, startWhenInView = true }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    let obs;
    function start() {
      if (started.current) return;
      started.current = true;
      const startTs = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - startTs) / duration);
        setValue(Math.floor(target * p));
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    if (!startWhenInView) {
      start();
      return;
    }

    if (ref.current) {
      obs = new IntersectionObserver(
        (entries) => entries.forEach((e) => e.isIntersecting && start()),
        { threshold: 0.4 }
      );
      obs.observe(ref.current);
    }
    return () => obs && obs.disconnect();
  }, [target, duration, startWhenInView]);

  return { ref, value };
}

export const PlayIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      opacity="0.5"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      fill="currentColor"
    />
    <path
      d="M15.4137 13.059L10.6935 15.8458C9.93371 16.2944 9 15.7105 9 14.7868V9.21316C9 8.28947 9.93371 7.70561 10.6935 8.15419L15.4137 10.941C16.1954 11.4026 16.1954 12.5974 15.4137 13.059Z"
      fill="currentColor"
    />
  </svg>
);

export const CheckIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      d="M20.285 6.709a1 1 0 0 1 .006 1.414l-9.193 9.285a1 1 0 0 1-1.419.007L3.71 11.51a1 1 0 1 1 1.414-1.415l5.164 5.163 8.486-8.486a1 1 0 0 1 1.415-.006z"
      fill="currentColor"
    />
  </svg>
);

export const StarIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      d="M12 2l2.938 6.037 6.662.97-4.82 4.7 1.138 6.634L12 17.77 6.082 20.34l1.138-6.634-4.82-4.7 6.662-.97L12 2z"
      fill="currentColor"
    />
  </svg>
);

export const ArrowRight = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M13 5l7 7-7 7M5 12h14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const QuoteIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M9 5H5a2 2 0 0 0-2 2v4a4 4 0 0 0 4 4h2V9H7V7h2V5zm12 0h-4a2 2 0 0 0-2 2v4a4 4 0 0 0 4 4h2V9h-2V7h2V5z" fill="currentColor" />
  </svg>
);
