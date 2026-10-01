'use client';

import { useEffect, useRef, useState } from 'react';
import { LARGE_IMAGE_QUERY, optImage } from '../_lib/optImage';

/**
 * A background photo that only downloads when it's about to scroll into view,
 * and picks the small or large WebP for the screen (see app/_lib/optImage.ts).
 *
 * Renders an absolutely-positioned layer BEHIND its parent's content
 * (z-index -1), so the parent needs `position: relative; isolation: isolate`.
 * `overlay` is an optional CSS gradient painted on top of the photo (e.g. the
 * blue wash on the Promise section).
 */
export function useLazyBgUrl(src: string, ref: React.RefObject<Element>) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pick = () => {
      const o = optImage(src);
      setUrl(window.matchMedia(LARGE_IMAGE_QUERY).matches ? o.lg : o.sm);
    };
    if (!('IntersectionObserver' in window)) return pick();
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          pick();
          io.disconnect();
        }
      },
      { rootMargin: '700px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src, ref]);
  return url;
}

export default function LazyBg({
  src,
  overlay,
  position = 'center',
  className,
}: {
  src: string;
  overlay?: string;
  position?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const url = useLazyBgUrl(src, ref);
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        backgroundImage: [overlay, url ? `url(${url})` : null].filter(Boolean).join(', ') || undefined,
        backgroundSize: 'cover',
        backgroundPosition: position,
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}
