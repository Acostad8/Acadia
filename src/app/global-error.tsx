"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("[global-error]", error.message, error.digest ?? "", error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          color: "#fafafa",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 16,
              border: "1px solid rgba(239, 68, 68, 0.3)",
              background: "rgba(239, 68, 68, 0.1)",
              marginBottom: 24,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={32}
              height={32}
              fill="none"
              stroke="#f87171"
              strokeWidth={1.8}
            >
              <path d="M12 9v4m0 4h.01" strokeLinecap="round" />
              <path
                d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            Falla crítica de la aplicación.
          </h1>
          <p style={{ marginTop: 12, color: "#a1a1aa", fontSize: 14 }}>
            Registramos el error. Refresca la página o vuelve al inicio.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 8,
                fontFamily: "monospace",
                fontSize: 11,
                color: "#52525b",
              }}
            >
              ref: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 32,
              padding: "10px 20px",
              borderRadius: 12,
              border: "none",
              background:
                "linear-gradient(90deg, #6366f1, #8b5cf6)",
              color: "white",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
