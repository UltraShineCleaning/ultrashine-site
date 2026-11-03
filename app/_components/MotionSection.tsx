import type { CSSProperties, ReactNode } from 'react';

/**
 * A section that fades up as it reaches the screen.
 *
 * Speed pass (2026-11-02): this used to be a framer-motion client component, so the
 * library (~40 KB) and a React observer shipped to every page that used it. It is now a
 * plain server component with a `rv` class; the tiny script in app/layout.tsx and the
 * CSS in globals.css do the reveal. Same look (24px rise, 0.55s ease-out), no JavaScript
 * per section, and the text is in the HTML for Google exactly as before.
 */
type Props = {
  children: ReactNode;
  className?: string;
  id?: string;
  delay?: number;
  /** Set 'as' to render a different element (default 'section') */
  as?: 'section' | 'div' | 'header' | 'footer';
  /** Kept for compatibility with existing call sites; reveal is per section. */
  stagger?: boolean;
};

export default function MotionSection({ children, className, id, delay = 0, as = 'section' }: Props) {
  const Tag = as;
  const style = delay ? ({ '--rv-d': `${delay}s` } as CSSProperties) : undefined;
  return (
    <Tag id={id} className={className ? `rv ${className}` : 'rv'} style={style}>
      {children}
    </Tag>
  );
}

/** A child that fades up on its own (optional delay). */
export function MotionItem({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const style = delay ? ({ '--rv-d': `${delay}s` } as CSSProperties) : undefined;
  return (
    <div className={className ? `rv ${className}` : 'rv'} style={style}>
      {children}
    </div>
  );
}
