"use client";
import { api } from "@/lib/public-api";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FiMail,
  FiPhone,
  FiMapPin,
  FiClock,
  FiInstagram,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

export default function ContactoPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(api("/api/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          message: form.message,
          _hp: honeypot,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error || "No se pudo enviar el mensaje.");
        return;
      }
      toast.success("\u00a1Mensaje enviado! Te responderemos pronto.");
      setForm({ name: "", email: "", message: "" });
      setHoneypot("");
    } catch {
      toast.error("Error de conexi\u00f3n. Prob\u00e1 de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <span className="text-primary font-semibold text-sm uppercase tracking-wider">
          Hablemos
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-warm-gray">
          Contacto
        </h1>
        <p className="mt-3 text-gray-500 max-w-lg mx-auto">
          &iquest;Ten&eacute;s alguna consulta o quer&eacute;s un pedido
          personalizado? Escribinos y te respondemos lo antes posible.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            <input
              type="text"
              name="_hp"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="sr-only"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
            <div>
              <label className="block text-sm font-semibold text-warm-gray mb-1.5">
                Nombre
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-warm-gray mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-warm-gray mb-1.5">
                Mensaje
              </label>
              <textarea
                rows={5}
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none bg-white"
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Enviando\u2026" : "Enviar Mensaje"}
            </Button>
          </form>
        </motion.div>

        {/* Info + Map */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-2xl border border-primary-light/30 shadow-sm p-6">
            <h2 className="text-lg font-bold text-warm-gray mb-5">
              Informaci&oacute;n de Contacto
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-light/40 flex items-center justify-center shrink-0">
                  <FiMapPin size={16} className="text-primary-dark" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-warm-gray">
                    Direcci&oacute;n
                  </p>
                  <p className="text-sm text-gray-500">
                    Solferino 4041, Montevideo, Uruguay
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-light/40 flex items-center justify-center shrink-0">
                  <FiPhone size={16} className="text-primary-dark" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-warm-gray">
                    Tel&eacute;fono
                  </p>
                  <a
                    href="tel:25099128"
                    className="text-sm text-gray-500 hover:text-primary"
                  >
                    2509 9128
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-mint/50 flex items-center justify-center shrink-0">
                  <FaWhatsapp size={16} className="text-green-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-warm-gray">
                    WhatsApp
                  </p>
                  <a
                    href="https://wa.me/59897629629"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 hover:text-green-600"
                  >
                    097 629 629
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent-light/50 flex items-center justify-center shrink-0">
                  <FiMail size={16} className="text-accent-dark" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-warm-gray">Email</p>
                  <a
                    href="mailto:karamba@vera.com.uy"
                    className="text-sm text-gray-500 hover:text-primary"
                  >
                    karamba@vera.com.uy
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary-light/50 flex items-center justify-center shrink-0">
                  <FiClock size={16} className="text-secondary-dark" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-warm-gray">
                    Horarios
                  </p>
                  <p className="text-sm text-gray-500">
                    Lunes a Viernes: 9:00 - 18:00
                  </p>
                  <p className="text-sm text-gray-500">
                    S&aacute;bados: 9:00 - 13:00
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-light/40 flex items-center justify-center shrink-0">
                  <FiInstagram size={16} className="text-primary-dark" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-warm-gray">
                    Instagram
                  </p>
                  <a
                    href="https://www.instagram.com/karamba.uy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 hover:text-primary"
                  >
                    @karamba
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Google Maps */}
          <div className="rounded-2xl overflow-hidden border border-primary-light/30 shadow-sm">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3271.8!2d-56.1695!3d-34.8941!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x959f81c8e05e6b3f%3A0x0!2sSolferino+4041%2C+Montevideo%2C+Uruguay!5e0!3m2!1ses!2suy!4v1"
              width="100%"
              height="250"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicaci\u00f3n Karamba"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
