import Link from 'next/link';

export const metadata = {
  title: 'Request Your Free Quote',
};

export default function QuotePage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', background: 'var(--cream)' }}>
      <div style={{ maxWidth: '640px', textAlign: 'center' }}>
        <p className="eyebrow" style={{ marginBottom: '16px' }}>QUOTE FORM</p>
        <h1 className="fraunces" style={{ fontSize: '52px', lineHeight: 1.05, marginBottom: '20px', letterSpacing: '-0.022em' }}>
          Form is being <em>upgraded</em>.
        </h1>
        <p style={{ fontSize: '17px', lineHeight: 1.6, opacity: 0.78, marginBottom: '36px' }}>
          We&apos;re re-building the quote form on the new stack. In the meantime — text or call us and we&apos;ll get you a custom quote in under an hour.
        </p>
        <a href="tel:5615836694" className="btn btn-coral" style={{ marginRight: '12px' }}>
          (561) 583-6694
        </a>
        <a href="mailto:contact@ultrashinecleaningfl.com" className="btn btn-primary">Email us</a>
        <p style={{ marginTop: '40px', fontSize: '13px' }}>
          <Link href="/">← Back to homepage</Link>
        </p>
      </div>
    </main>
  );
}
