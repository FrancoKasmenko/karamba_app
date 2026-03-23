"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FiInstagram, FiChevronLeft, FiChevronRight } from "react-icons/fi";

const INSTAGRAM_URL = "https://www.instagram.com/karamba.uy/";
const SCROLL_HIDE =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

type FeedPost = {
  id: string;
  image: string;
  url: string;
  caption?: string;
  is_video?: boolean;
};

type FeedResponse = {
  success: boolean;
  posts: FeedPost[];
  source: "manual" | "scrape" | "none";
  error?: string;
};

function imageSrcForPost(image: string): string {
  const t = image.trim();
  if (!t) return "";
  if (t.startsWith("/")) return t;
  if (!/^https?:\/\//i.test(t)) return `/${t}`;
  try {
    const u = new URL(t);
    const h = u.hostname.toLowerCase();
    if (h.endsWith(".cdninstagram.com") || h.endsWith(".fbcdn.net")) {
      return `/api/instagram/image?url=${encodeURIComponent(t)}`;
    }
  } catch {
    return t;
  }
  return t;
}

function InstagramFallback({
  loading,
  subtle,
}: {
  loading?: boolean;
  subtle?: string | null;
}) {
  return (
    <section className="relative py-16 sm:py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-pink-50/40 via-transparent to-lavender/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent-light/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-[2rem] p-10 sm:p-14 text-center relative overflow-hidden bg-gradient-to-br from-pink-50/90 via-purple-50/40 to-orange-50/60 border border-pink-100/60 shadow-xl shadow-pink-200/20"
        >
          <div className="absolute top-0 right-0 w-72 h-72 bg-pink-200/25 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-purple-200/20 rounded-full translate-y-1/3 -translate-x-1/3 blur-3xl" />

          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-400 via-purple-400 to-orange-300 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-pink-300/30 ring-4 ring-white/80">
              <FiInstagram size={36} className="text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-warm-gray tracking-tight">
              Seguinos en Instagram
            </h2>
            <p className="mt-3 text-gray-600 max-w-lg mx-auto text-base leading-relaxed">
              Inspirate con nuestras creaciones, tutoriales y novedades
            </p>
            <p className="mt-2 text-pink-500 font-semibold">@karamba.uy</p>
            {loading && (
              <div className="mt-8 max-w-3xl mx-auto">
                <div
                  className={`flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 ${SCROLL_HIDE}`}
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="snap-start shrink-0 w-[160px] sm:w-[180px] aspect-square rounded-2xl bg-gradient-to-br from-pink-100/80 to-purple-100/60 animate-pulse border border-white/60 shadow-inner"
                    />
                  ))}
                </div>
                <p className="mt-4 text-sm text-gray-400">Cargando publicaciones…</p>
              </div>
            )}
            {subtle && !loading && (
              <p className="mt-2 text-xs text-gray-400 max-w-md mx-auto">{subtle}</p>
            )}
            {!loading && (
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-8 text-sm font-semibold bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 text-white px-8 py-3.5 rounded-full shadow-md shadow-pink-400/25 hover:shadow-lg hover:shadow-pink-400/30 hover:scale-[1.02] transition-all duration-300"
              >
                <FiInstagram size={16} />
                Ver Instagram
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function InstagramSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<{
    loading: boolean;
    data: FeedResponse | null;
  }>({ loading: true, data: null });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/instagram/feed")
      .then(async (r) => {
        const json = (await r.json()) as FeedResponse;
        if (!cancelled) {
          if (!json || typeof json.success !== "boolean" || !Array.isArray(json.posts)) {
            setState({
              loading: false,
              data: {
                success: false,
                posts: [],
                source: "none",
                error: "Respuesta inválida del servidor",
              },
            });
            return;
          }
          setState({ loading: false, data: json });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            loading: false,
            data: {
              success: false,
              posts: [],
              source: "none",
              error: "No se pudo conectar",
            },
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  if (state.loading) {
    return <InstagramFallback loading />;
  }

  const data = state.data;
  const posts = data?.posts ?? [];
  const showFeed = Boolean(data?.success && posts.length > 0);

  if (!showFeed) {
    return (
      <InstagramFallback
        subtle={
          process.env.NODE_ENV === "development" && data?.error ? data.error : null
        }
      />
    );
  }

  return (
    <section className="relative py-16 sm:py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-pink-50/35 via-transparent to-lavender/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent-light/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-10"
        >
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-pink-500 mb-2 hover:text-pink-600 transition-colors"
          >
            <FiInstagram size={18} />
            @karamba.uy
          </a>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-warm-gray tracking-tight">
            Seguinos en Instagram
          </h2>
          <p className="mt-3 text-gray-600 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
            &Uacute;ltimas publicaciones: inspiraci&oacute;n, tutoriales y novedades
          </p>
        </motion.div>

        <div className="rounded-[1.75rem] bg-gradient-to-br from-pink-50/70 via-white/90 to-purple-50/50 border border-pink-100/50 shadow-xl shadow-pink-100/30 p-5 sm:p-7 lg:p-8">
          <div className="relative">
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => scroll("left")}
              className="absolute -left-1 sm:left-1 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-white/95 backdrop-blur-sm rounded-full shadow-md border border-pink-100/80 flex items-center justify-center text-pink-500 hover:bg-pink-50 hover:scale-105 transition-all duration-300"
            >
              <FiChevronLeft size={22} />
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              onClick={() => scroll("right")}
              className="absolute -right-1 sm:right-1 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-white/95 backdrop-blur-sm rounded-full shadow-md border border-pink-100/80 flex items-center justify-center text-pink-500 hover:bg-pink-50 hover:scale-105 transition-all duration-300"
            >
              <FiChevronRight size={22} />
            </button>

            <div
              ref={scrollRef}
              className={`flex gap-5 sm:gap-6 overflow-x-auto snap-x snap-mandatory px-12 sm:px-14 py-3 ${SCROLL_HIDE}`}
            >
              {posts.map((post, i) => {
                const src = imageSrcForPost(post.image);
                return (
                  <motion.a
                    key={post.id}
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: Math.min(i * 0.07, 0.5), duration: 0.35 }}
                    className="snap-start shrink-0 w-[200px] sm:w-[228px] group focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 focus-visible:ring-offset-2 rounded-2xl"
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden relative bg-pink-50/80 border border-white shadow-md shadow-pink-100/40 hover:shadow-xl hover:shadow-pink-200/35 transition-shadow duration-300">
                      {src ? (
                        <img
                          src={src}
                          alt={
                            post.caption?.slice(0, 80) || "Publicación de Instagram"
                          }
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                          loading="lazy"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/0 group-hover:bg-black/20 transition-colors duration-300">
                        <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/90 text-pink-500 shadow-lg scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                          <FiInstagram size={28} strokeWidth={2} />
                        </span>
                      </div>
                      {post.is_video && (
                        <div className="absolute top-3 right-3 z-[1]">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-black/45 text-white shadow-md backdrop-blur-[2px]">
                            <svg
                              viewBox="0 0 24 24"
                              className="w-4 h-4 ml-0.5"
                              fill="currentColor"
                              aria-hidden
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="text-center mt-10">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 text-white px-8 py-3.5 rounded-full shadow-md shadow-pink-400/25 hover:shadow-lg hover:shadow-pink-400/30 hover:scale-[1.02] transition-all duration-300"
          >
            <FiInstagram size={16} />
            Ver Instagram
          </a>
        </div>
      </div>
    </section>
  );
}
