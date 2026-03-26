import type { Metadata } from "next";
import { getEmailPreviewSamples } from "@/lib/email-preview-samples";

export const metadata: Metadata = {
  title: "Vista previa de correos — Karamba",
  robots: { index: false, follow: false },
};

const SAMPLE_USER = "Juan Pérez";

export default function PreviewsCorreosPage() {
  const samples = getEmailPreviewSamples(SAMPLE_USER);

  return (
    <div className="min-h-screen bg-[#f4f4f5] py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-pink-600 mb-2">
          Karamba · emails transaccionales
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#831843] mb-3">
          Vista previa de correos
        </h1>
        <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          Ejemplos con el usuario de prueba{" "}
          <strong className="text-gray-800">{SAMPLE_USER}</strong>. Los enlaces y
          el logo usan tu <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-pink-100">BASE_URL</code>{" "}
          actual (en desarrollo suele ser localhost).
        </p>
        <p className="mt-4 text-xs text-gray-500">
          URL de esta página:{" "}
          <span className="font-mono text-pink-700">/previews-correos</span>
        </p>
      </div>

      <div className="mx-auto max-w-[640px] space-y-14">
        {samples.map((s) => (
          <section
            key={s.key}
            className="rounded-2xl border border-pink-100 bg-white/90 shadow-sm overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-pink-50 bg-gradient-to-r from-pink-50/80 to-violet-50/50">
              <h2 className="font-semibold text-[#831843] text-lg">{s.label}</h2>
              <p className="text-sm text-gray-500 mt-1">{s.description}</p>
            </div>
            <div className="p-3 sm:p-4 bg-[#fff1f5]/50">
              <iframe
                title={s.label}
                srcDoc={s.html}
                className="w-full min-h-[640px] rounded-xl border border-pink-100/80 bg-white shadow-inner"
              />
            </div>
          </section>
        ))}
      </div>

      <p className="text-center text-xs text-gray-400 mt-14 max-w-md mx-auto">
        Esta ruta es solo para revisar diseños. En producción podés restringirla o
        eliminarla si no la querés pública.
      </p>
    </div>
  );
}
