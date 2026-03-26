"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const paragraphs = [
  "Karamba nació desde las ganas de crear para mis hijos y el deseo de estar presente, acompañando cada paso de su crecimiento.",
  "Empecé haciendo detalles para sus cumpleaños, buscando sorprenderlos y verlos felices. Sin darme cuenta, eso que hacía en casa empezó a crecer y a tomar forma.",
  "Con el tiempo, ese pasatiempo se transformó en un trabajo, en una forma de vida y en un proyecto familiar ✨",
] as const;

export default function StorySection() {
  return (
    <section className="relative py-12 sm:py-16 overflow-hidden">
      <div className="absolute top-8 left-1/4 w-56 h-56 bg-accent-light/25 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-4 right-1/4 w-48 h-48 bg-mint/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6 sm:mb-8"
        >
          <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Nuestra historia
          </span>
        </motion.div>

        <motion.article
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mx-auto max-w-[34rem] sm:max-w-[36rem]"
        >
          <h2 className="text-center text-2xl sm:text-3xl font-bold tracking-tight text-warm-gray mb-8 sm:mb-10">
            <span aria-hidden="true" className="mr-2 inline-block">
              💛
            </span>
            <span className="text-gradient inline-block">Hola, soy Majo</span>
          </h2>
          <div className="space-y-6 sm:space-y-7 text-center sm:text-left text-warm-gray/90 text-[17px] sm:text-lg font-normal leading-[1.8]">
            {paragraphs.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </motion.article>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-12 sm:mt-14 flex justify-center"
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
