"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const highlights = [
  {
    title: "Pasión",
    body: [
      "Por crear herramientas y productos pensados para transformar tus ideas.",
    ],
    accent: "from-primary-light/30 to-primary-light/10 border-primary-light/40",
  },
  {
    title: "Compromiso",
    body: [
      "Con cada detalle, diseñando productos lindos, funcionales y que realmente resuelven.",
    ],
    accent: "from-accent-light/40 to-lavender/20 border-accent-light/50",
  },
  {
    title: "Propósito",
    body: [
      "Acompañarte en tu camino creativo para que tus ideas crezcan y se hagan realidad.",
    ],
    accent: "from-mint/35 to-secondary-light/25 border-mint/50",
  },
] as const;

export default function StorySection() {
  return (
    <section className="relative py-10 sm:py-14 overflow-hidden">
      <div className="absolute top-8 left-1/4 w-56 h-56 bg-accent-light/25 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-4 right-1/4 w-48 h-48 bg-mint/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-12"
        >
          <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Nuestra historia
          </span>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {highlights.map((item, i) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.08 * i }}
              className={`rounded-2xl p-7 sm:p-8 bg-gradient-to-br ${item.accent} border shadow-sm text-center md:text-left`}
            >
              <h3 className="text-base sm:text-lg font-bold text-warm-gray tracking-wide mb-4">
                {item.title}
              </h3>
              <div className="space-y-3 text-gray-600 text-sm sm:text-base leading-relaxed">
                {item.body.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-10 flex justify-center"
        >
          <Link
            href="/nosotros"
            className="inline-flex items-center gap-2 font-semibold text-sm text-white px-7 py-3 rounded-full bg-gradient-to-r from-accent-dark via-primary to-secondary shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
          >
            Conocer nuestra historia &#x1F49B;
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
