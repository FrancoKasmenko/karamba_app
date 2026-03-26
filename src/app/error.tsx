"use client";

import { useEffect } from "react";
import Link from "next/link";
import { formatErrorForDisplay } from "@/lib/fetch-json";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const raw = error.message || "Algo salió mal al cargar esta página.";
  const display = formatErrorForDisplay(raw);

  return (
    <div className="min-h-[55vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-xl w-full rounded-3xl border border-primary-light/50 bg-white shadow-xl shadow-primary/10 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-light/40 via-lavender/30 to-accent-light/30 px-8 py-6 border-b border-primary-light/40">
          <p className="text-primary font-bold text-xs uppercase tracking-[0.2em]">
            Error
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-warm-gray">
            Algo no salió como esperábamos
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            El detalle técnico aparece abajo, formateado para que sea más fácil
            de leer o compartir con soporte.
          </p>
        </div>
        <div className="px-8 py-6 space-y-5">
          <div className="rounded-2xl bg-cream border border-primary-light/35 p-4 max-h-64 overflow-auto">
            <pre className="text-xs sm:text-sm text-warm-gray whitespace-pre-wrap break-words font-mono leading-relaxed">
              {display}
            </pre>
          </div>
          {error.digest ? (
            <p className="text-[11px] text-gray-400 font-mono text-center">
              Ref: {error.digest}
            </p>
          ) : null}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex justify-center items-center font-semibold text-sm text-white px-6 py-3 rounded-full bg-gradient-to-r from-accent-dark via-primary to-secondary shadow-md hover:shadow-lg transition-shadow"
            >
              Reintentar
            </button>
            <Link
              href="/"
              className="inline-flex justify-center items-center font-semibold text-sm text-primary-dark px-6 py-3 rounded-full border-2 border-primary/40 hover:bg-primary-light/30 transition-colors"
            >
              Ir al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
