"use client";

/**
 * Last-resort boundary for errors in the root layout itself. It renders its own document
 * and does not receive global styles, so it is deliberately self-contained.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 500 }}>Something went wrong</h1>
          <p style={{ color: "#a3a3a3" }}>
            The app hit an unexpected error{error.digest ? ` (reference ${error.digest})` : ""}.
          </p>
          <button
            onClick={() => retry()}
            style={{ marginTop: 16, padding: "8px 16px", borderRadius: 6, border: 0, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
