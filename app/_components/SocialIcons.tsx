import { SOCIAL_LINKS } from '../_lib/social-links';

/** Round Instagram / Facebook / Google icons. Hidden links (empty URL) simply don't render. */
const PATHS: Record<string, string> = {
  instagram:
    'M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2zm0 7.9A3.1 3.1 0 1 1 12 8.9a3.1 3.1 0 0 1 0 6.2zM17 5.8a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM21.9 7.3c-.1-1.6-.4-3-1.6-4.2S17.7 1.6 16.1 1.5C14.5 1.4 9.5 1.4 7.9 1.5 6.3 1.6 4.9 1.9 3.7 3.1S2.1 5.7 2 7.3C1.9 8.9 1.9 15.1 2 16.7c.1 1.6.4 3 1.6 4.2s2.6 1.5 4.2 1.6c1.6.1 6.6.1 8.2 0 1.6-.1 3-.4 4.2-1.6s1.5-2.6 1.6-4.2c.1-1.6.1-7.8.1-9.4zM19.8 19.1a3.3 3.3 0 0 1-1.9 1.9c-1.3.5-4.4.4-5.9.4s-4.6.1-5.9-.4a3.3 3.3 0 0 1-1.9-1.9c-.5-1.3-.4-4.4-.4-5.9s-.1-4.6.4-5.9A3.3 3.3 0 0 1 6.1 5.4c1.3-.5 4.4-.4 5.9-.4s4.6-.1 5.9.4a3.3 3.3 0 0 1 1.9 1.9c.5 1.3.4 4.4.4 5.9s.1 4.6-.4 5.9z',
  facebook: 'M14 8.5V6.7c0-.8.5-1 .9-1h2.4V2h-3.3C10.4 2 9.6 4.7 9.6 6.4v2.1H7.5v3.8h2.1V22h4.4v-9.7h3l.4-3.8H14z',
  google:
    'M21.4 10.4h-9.2v3.4h5.3c-.5 2.4-2.6 3.8-5.3 3.8a5.6 5.6 0 0 1 0-11.2c1.4 0 2.6.5 3.6 1.3l2.5-2.5A9.2 9.2 0 0 0 12.2 3a9 9 0 1 0 0 18c4.5 0 8.6-3.3 8.6-9 0-.5-.1-1.1-.2-1.6z',
};

export default function SocialIcons({ size = 42, center = false }: { size?: number; center?: boolean }) {
  if (!SOCIAL_LINKS.length) return null;
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: center ? 'center' : 'flex-start' }}>
      {SOCIAL_LINKS.map((l) => (
        <a
          key={l.key}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={l.label}
          title={l.label}
          style={{
            width: size,
            height: size,
            minHeight: 0,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <svg viewBox="0 0 24 24" width={size * 0.46} height={size * 0.46} fill="#fff" aria-hidden="true">
            <path d={PATHS[l.key]} />
          </svg>
        </a>
      ))}
    </div>
  );
}
