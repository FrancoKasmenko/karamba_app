"use client";

import { useEffect } from "react";
import { formatErrorForDisplay } from "@/lib/fetch-json";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const display = formatErrorForDisplay(
    error.message || "Error crítico al cargar la aplicación."
  );

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          background: "#fff7f8",
          color: "#5e4a4e",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              maxWidth: 480,
              width: "100%",
              borderRadius: 24,
              border: "1px solid #fdd7de",
              background: "#fff",
              boxShadow: "0 20px 50px rgba(232, 99, 122, 0.12)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "24px 28px",
                background:
                  "linear-gradient(135deg, #ffe8ee 0%, #f0e0f5 50%, #fef4dc 100%)",
                borderBottom: "1px solid #fdd7de",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  color: "#e8637a",
                  margin: 0,
                }}
              >
                ERROR
              </p>
              <h1
                style={{
                  margin: "10px 0 0",
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                Karamba — problema al cargar
              </h1>
              <p style={{ margin: "10px 0 0", fontSize: 14, opacity: 0.85 }}>
                Probá recargar la página. Si el mensaje parece JSON, ya viene
                formateado abajo.
              </p>
            </div>
            <div style={{ padding: 24 }}>
              <pre
                style={{
                  margin: 0,
                  padding: 16,
                  borderRadius: 16,
                  background: "#fdf0f2",
                  border: "1px solid #fdd7de",
                  fontSize: 12,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: 240,
                  overflow: "auto",
                }}
              >
                {display}
              </pre>
              {error.digest ? (
                <p
                  style={{
                    marginTop: 12,
                    fontSize: 11,
                    color: "#9ca3af",
                    textAlign: "center",
                    fontFamily: "monospace",
                  }}
                >
                  Ref: {error.digest}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 20,
                  padding: "14px 20px",
                  border: "none",
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#fff",
                  cursor: "pointer",
                  background: "linear-gradient(90deg, #e5ad42, #e8637a, #d4a0dc)",
                }}
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
