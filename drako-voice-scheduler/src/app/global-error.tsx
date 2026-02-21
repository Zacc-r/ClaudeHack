'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0A0A0F', color: '#F8FAFC' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Something went wrong</h2>
            <button
              onClick={() => reset()}
              style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #38BDF8, #818CF8)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
