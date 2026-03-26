"use client";
import { api } from "@/lib/public-api";
import { fetchJson, fetchJsonErrorMessage } from "@/lib/fetch-json";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FiAlertCircle, FiPlay, FiRadio } from "react-icons/fi";

interface YouTubeStatus {
  isLive: boolean;
  liveVideoId: string | null;
  latestVideoId: string | null;
  latestVideoTitle: string | null;
  latestVideoThumbnail: string | null;
  channelUrl: string;
}

export default function YouTubeSection() {
  const [status, setStatus] = useState<YouTubeStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetchJson<YouTubeStatus>(api("/api/youtube/status"));
      if (cancelled) return;
      if (r.ok) {
        setStatus(r.data);
        setLoadError(null);
        return;
      }
      setLoadError(fetchJsonErrorMessage(r));
      setStatus(null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const videoId = status?.isLive
    ? status.liveVideoId
    : status?.latestVideoId;

  return (
    <section className="relative py-16 sm:py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-warm-gray/[0.03] via-transparent to-lavender/10 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-light/15 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/4 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          {status?.isLive ? (
            <>
              <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                EN VIVO AHORA
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-warm-gray">
                Estamos en vivo ahora
              </h2>
            </>
          ) : (
            <>
              <span className="text-secondary-dark font-semibold text-sm uppercase tracking-wider">
                Nuestro espacio
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-warm-gray">
                Nuestro Podcast
              </h2>
              <p className="mt-3 text-gray-500 max-w-xl mx-auto">
                Historias, emprendimiento y creatividad. Acompa&ntilde;anos en
                cada episodio.
              </p>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="max-w-4xl mx-auto"
        >
          <div className="rounded-2xl overflow-hidden shadow-xl border border-primary-light/30 bg-white">
            {loadError ? (
              <div className="aspect-video flex flex-col items-center justify-center gap-3 px-6 py-8 bg-gradient-to-br from-amber-50/90 to-primary-light/15">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800">
                  <FiAlertCircle size={28} />
                </div>
                <p className="text-center text-sm font-semibold text-warm-gray max-w-md">
                  No pudimos cargar el video de YouTube en este momento.
                </p>
                <div className="w-full max-w-md rounded-xl border border-amber-200/80 bg-white/90 px-4 py-3 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900/80 mb-1">
                    Detalle
                  </p>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                    {loadError}
                  </p>
                </div>
                <a
                  href="https://www.youtube.com/@SOMOS-KARAMBA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 underline"
                >
                  <FiPlay size={14} />
                  Abrir canal en YouTube
                </a>
              </div>
            ) : videoId ? (
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}${status?.isLive ? "?autoplay=1" : ""}`}
                  title="Karamba Podcast"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            ) : (
              <a
                href={status?.channelUrl || "https://www.youtube.com/@SOMOS-KARAMBA"}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-video bg-gradient-to-br from-warm-gray/5 to-primary-light/20 flex items-center justify-center group"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                    <FiPlay size={32} className="text-white ml-1" />
                  </div>
                  <p className="text-warm-gray font-semibold text-lg">
                    Mir&aacute; nuestro canal
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    @SOMOS-KARAMBA en YouTube
                  </p>
                </div>
              </a>
            )}
          </div>

          {status?.latestVideoTitle && !status.isLive && (
            <p className="text-center text-sm text-gray-500 mt-4">
              <FiRadio className="inline mr-1.5 -mt-0.5" />
              {status.latestVideoTitle}
            </p>
          )}
        </motion.div>

        <div className="text-center mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/podcast"
            className="inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-primary to-secondary text-white px-7 py-3 rounded-full hover:shadow-lg hover:shadow-primary/20 transition-all"
          >
            <FiRadio size={16} />
            Conocer el podcast
          </Link>
          <a
            href={status?.channelUrl || "https://www.youtube.com/@SOMOS-KARAMBA"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold border-2 border-red-400 text-red-500 px-7 py-3 rounded-full hover:bg-red-500 hover:text-white transition-all"
          >
            <FiPlay size={14} />
            Ver en YouTube
          </a>
        </div>
      </div>
    </section>
  );
}
