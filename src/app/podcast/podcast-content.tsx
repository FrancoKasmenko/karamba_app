"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiRadio, FiPlay, FiHeart, FiSend, FiStar } from "react-icons/fi";
import { FaYoutube } from "react-icons/fa";

const CHANNEL_URL = "https://www.youtube.com/@SOMOS-KARAMBA";

interface YouTubeStatus {
  isLive: boolean;
  liveVideoId: string | null;
  latestVideoId: string | null;
  latestVideoTitle: string | null;
  channelUrl: string;
}

const storyParagraphs = [
  "Estamos armando algo muy especial para la apertura de Más que un Montón.",
  "Todavía falta un poquito… pero como esto lleva tiempo, ya quiero hacerte esta invitación.",
  "La cortina musical del programa va a estar hecha con imágenes de personas que crean, que emprenden, que se animan a hacer lo que aman.",
  "Si tenés un emprendimiento y querés ser parte, grabá un pequeño video mostrando tu mundo: tu taller, tus manos trabajando, tus materiales o tu proceso creativo.",
  "No importa el rubro. No importa si recién empezás o si ya llevás años. Y tampoco hace falta mostrar tu cara si no te gusta.",
  "La idea es mostrar que detrás de cada proyecto hay una historia, una persona y muchas ganas de crecer haciendo lo que le gusta.",
  "Si querés participar es muy fácil: dejame un DM y te cuento cómo sumarte.",
  "Este programa no se trata solo de nosotros. Se trata de todas las personas que crean, emprenden y se animan.",
];

const closingLine =
  "Porque cuando muchas historias se juntan… somos más que un montón.";

export default function PodcastContent() {
  const [status, setStatus] = useState<YouTubeStatus | null>(null);

  useEffect(() => {
    fetch("/api/youtube/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  const videoId = status?.isLive
    ? status.liveVideoId
    : status?.latestVideoId;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-12 pb-16 sm:pt-16 sm:pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-light/20 via-lavender/10 to-cream pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary-light/20 rounded-full blur-[120px] translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-mint/15 rounded-full blur-[100px] -translate-x-1/4 pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 bg-red-50 text-red-500 px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
              <FaYoutube size={16} />
              @SOMOS-KARAMBA
            </div>

            {status?.isLive && (
              <div className="inline-flex items-center gap-2 bg-red-500 text-white px-5 py-2 rounded-full text-sm font-bold mb-5 ml-3 animate-pulse">
                <span className="w-2.5 h-2.5 bg-white rounded-full" />
                EN VIVO AHORA
              </div>
            )}

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-warm-gray leading-tight">
              M&aacute;s que un{" "}
              <span className="text-gradient">Mont&oacute;n</span>
            </h1>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              Un espacio donde las historias de emprendimiento, creatividad y
              pasi&oacute;n se encuentran.
            </p>
          </motion.div>

          {/* Video player */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="max-w-4xl mx-auto"
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-primary-light/30 bg-white">
              {videoId ? (
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}${status?.isLive ? "?autoplay=1" : ""}`}
                    title="Más que un Montón - Podcast"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <a
                  href={CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-video bg-gradient-to-br from-warm-gray/5 to-primary-light/20 flex items-center justify-center group"
                >
                  <div className="text-center">
                    <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                      <FiPlay size={32} className="text-white ml-1" />
                    </div>
                    <p className="text-warm-gray font-semibold text-lg">
                      Ver nuestro canal
                    </p>
                  </div>
                </a>
              )}
            </div>
          </motion.div>

          <div className="text-center mt-6">
            <a
              href={CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-600 transition-colors"
            >
              <FaYoutube size={18} />
              Suscribite a nuestro canal
            </a>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <FiHeart className="mx-auto text-primary mb-3" size={28} />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-warm-gray">
              Una invitaci&oacute;n especial
            </h2>
          </motion.div>

          <div className="space-y-6">
            {storyParagraphs.map((p, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="text-gray-600 text-base sm:text-lg leading-relaxed text-center"
              >
                {p}
              </motion.p>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <div className="inline-block bg-gradient-to-r from-primary-light/40 via-lavender/30 to-secondary-light/40 rounded-2xl px-8 py-6">
              <p className="text-xl sm:text-2xl font-bold text-warm-gray italic leading-relaxed">
                &ldquo;{closingLine}&rdquo;
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How to participate */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-primary-light/10 via-cream to-lavender/10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <FiStar className="mx-auto text-secondary mb-3" size={28} />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-warm-gray">
              &iquest;C&oacute;mo participar?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: FiRadio,
                title: "Grabá un video",
                desc: "Mostrá tu taller, tus manos trabajando, tus materiales o tu proceso creativo.",
                color: "bg-primary-light/30 text-primary-dark",
              },
              {
                icon: FiSend,
                title: "Envianos un DM",
                desc: "Escribinos por Instagram o WhatsApp y te contamos cómo sumarte al proyecto.",
                color: "bg-lavender/30 text-purple-700",
              },
              {
                icon: FiHeart,
                title: "Sé parte",
                desc: "Tu historia va a ser parte de la cortina musical de Más que un Montón.",
                color: "bg-mint/30 text-green-700",
              },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 text-center shadow-sm border border-primary-light/20"
              >
                <div
                  className={`w-14 h-14 ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}
                >
                  <step.icon size={24} />
                </div>
                <h3 className="font-bold text-warm-gray text-lg mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <a
              href="https://www.instagram.com/karamba.uy/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-primary to-secondary text-white px-7 py-3 rounded-full hover:shadow-lg hover:shadow-primary/20 transition-all"
            >
              <FiSend size={14} />
              Escribinos por Instagram
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
