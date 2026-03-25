"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  FiCpu,
  FiMonitor,
  FiMessageCircle,
  FiSearch,
  FiFileText,
  FiCheckCircle,
  FiArrowRight,
  FiZap,
} from "react-icons/fi";

const WA_BASE = "https://wa.me/59897629629";
const wa = (text: string) =>
  `${WA_BASE}?text=${encodeURIComponent(text)}`;

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

const listContainerVars = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const listItemVars = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

function GridBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.35]"
      aria-hidden
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "56px 56px",
        maskImage:
          "radial-gradient(ellipse 80% 70% at 50% 0%, black 20%, transparent 75%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 80% 70% at 50% 0%, black 20%, transparent 75%)",
      }}
    />
  );
}

function GlowOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-emerald-500/20 blur-[100px]"
        animate={{ opacity: [0.35, 0.55, 0.35], scale: [1, 1.08, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-40 -right-20 h-80 w-80 rounded-full bg-cyan-500/15 blur-[90px]"
        animate={{ opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-emerald-400/10 blur-[80px]"
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
    </div>
  );
}

function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400/90 mb-3 ${className}`}
    >
      {children}
    </span>
  );
}

export default function SolucionesDigitalesClient() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100 font-[family-name:var(--font-sans)]">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black" />
      <GridBackdrop />
      <GlowOrbs />

      {/* Karamba subtle bridge */}
      <div className="relative z-10 border-b border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-center gap-2 text-xs text-zinc-500">
          <Link
            href="/"
            className="text-zinc-400 hover:text-emerald-400/90 transition-colors"
          >
            Karamba
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-300 font-medium tracking-wide">
            Soluciones informáticas
          </span>
        </div>
      </div>

      {/* HERO */}
      <section className="relative z-10 px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400/80 mb-6">
              Karamba · extensión digital
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.75rem] font-bold leading-[1.12] tracking-tight text-white">
              Soluciones informáticas para{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-300 bg-clip-text text-transparent">
                potenciar tu emprendimiento
              </span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Desde arreglar tu computadora hasta crear tu web o sistema,
              hacemos que la tecnología trabaje para vos.
            </p>
            <motion.a
              href={wa(
                "Hola! Me interesan las soluciones digitales de Karamba. ¿Podemos hablar?"
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-4 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/40 hover:shadow-xl transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Hablar por WhatsApp
              <FiArrowRight className="opacity-90" />
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* DESARROLLO */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-24 border-t border-white/5">
        <div className="mx-auto max-w-5xl">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
            <SectionLabel>Servicios</SectionLabel>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 lg:gap-12">
              <div className="lg:max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                    <FiCpu size={22} />
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Desarrollo digital
                  </h2>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  Si querés profesionalizar tu marca o empezar desde cero,
                  creamos soluciones simples, claras y adaptadas a vos.
                </p>
              </div>
              <motion.ul
                className="flex-1 grid sm:grid-cols-2 gap-3"
                variants={listContainerVars}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-40px" }}
              >
                {[
                  "Páginas web profesionales",
                  "Tiendas online",
                  "Landing pages",
                  "Sistemas a medida",
                  "Automatización de procesos",
                ].map((label) => (
                  <motion.li
                    key={label}
                    variants={listItemVars}
                    className="group rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-zinc-200 hover:border-emerald-500/30 hover:bg-white/[0.06] hover:shadow-[0_0_32px_-8px_rgba(52,211,153,0.2)] transition-all duration-300"
                  >
                    <span className="flex items-center gap-2">
                      <FiZap className="text-emerald-400/70 shrink-0 group-hover:text-emerald-400 transition-colors" />
                      {label}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
            <motion.p
              {...fadeUp}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="mt-10 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/5 px-5 py-3 text-sm text-cyan-200/90"
            >
              <span className="font-semibold text-cyan-300">Tip:</span>
              No necesitás saber de tecnología, nosotros lo hacemos por vos.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* SOPORTE */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-24 border-t border-white/5">
        <div className="mx-auto max-w-5xl">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
            <SectionLabel>Asistencia</SectionLabel>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 lg:gap-12">
              <div className="lg:max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20">
                    <FiMonitor size={22} />
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Soporte técnico
                  </h2>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  Si tu computadora te frena, lo solucionamos para que puedas
                  trabajar sin interrupciones.
                </p>
              </div>
              <motion.ul
                className="flex-1 grid sm:grid-cols-2 gap-3"
                variants={listContainerVars}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-40px" }}
              >
                {[
                  "Reparación de PC",
                  "Formateo e instalación",
                  "Optimización de rendimiento",
                  "Eliminación de virus",
                  "Asesoramiento técnico",
                ].map((label) => (
                  <motion.li
                    key={label}
                    variants={listItemVars}
                    className="group rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-zinc-200 hover:border-cyan-500/30 hover:bg-white/[0.06] hover:shadow-[0_0_32px_-8px_rgba(34,211,238,0.2)] transition-all duration-300"
                  >
                    <span className="flex items-center gap-2">
                      <FiCheckCircle className="text-cyan-400/70 shrink-0 group-hover:text-cyan-400 transition-colors" />
                      {label}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SOBRE FRANCO */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-24 border-t border-white/5">
        <div className="mx-auto max-w-3xl">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-8 sm:p-10 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.6)] hover:border-emerald-500/20 hover:shadow-[0_28px_90px_-20px_rgba(16,185,129,0.12)] transition-all duration-500"
          >
            <SectionLabel>Quién está detrás</SectionLabel>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
              Franco
            </h2>
            <p className="text-zinc-400 leading-relaxed text-base sm:text-lg">
              Soy programador y técnico informático, actualmente trabajando en
              desarrollo de software. Me enfoco en brindar soluciones claras,
              prácticas y adaptadas a cada necesidad.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-24 border-t border-white/5">
        <div className="mx-auto max-w-4xl">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
            <SectionLabel className="mb-3">Proceso</SectionLabel>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Cómo funciona
            </h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-6 lg:gap-8">
            {[
              {
                step: "1",
                title: "Me escribís por WhatsApp",
                icon: FiMessageCircle,
              },
              { step: "2", title: "Analizo tu caso", icon: FiSearch },
              {
                step: "3",
                title: "Te paso una propuesta clara",
                icon: FiFileText,
              },
              { step: "4", title: "Lo resolvemos", icon: FiCheckCircle },
            ].map(({ step, title, icon: Icon }, index) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.45 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 hover:border-white/20 hover:bg-white/[0.05] transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-sm font-bold text-emerald-300 ring-1 ring-white/10">
                    {step}
                  </span>
                  <div>
                    <Icon className="text-cyan-400/80 mb-2" size={20} />
                    <p className="text-base sm:text-lg font-medium text-zinc-100 leading-snug">
                      {title}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative z-10 px-4 sm:px-6 py-20 sm:py-28 border-t border-white/5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mx-auto max-w-2xl text-center rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/10 via-transparent to-cyan-500/5 px-6 py-14 sm:px-10 sm:py-16 shadow-[0_0_60px_-20px_rgba(52,211,153,0.35)]"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            ¿Tenés un problema o una idea?
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Hablemos y lo resolvemos.
          </p>
          <motion.a
            href={wa(
              "Hola! Quiero consultar mi caso con soluciones digitales Karamba."
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15 hover:border-emerald-400/40 hover:shadow-[0_0_40px_-10px_rgba(52,211,153,0.4)] transition-all duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Consultar mi caso
            <FiArrowRight />
          </motion.a>
        </motion.div>
      </section>

      <div className="relative z-10 pb-10 text-center">
        <Link
          href="/productos"
          className="text-sm text-zinc-500 hover:text-emerald-400/80 transition-colors"
        >
          ← Volver a la tienda Karamba
        </Link>
      </div>
    </div>
  );
}
