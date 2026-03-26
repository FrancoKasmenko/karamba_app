"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

export default function OlvideContrasenaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Algo salió mal");
        return;
      }
      setSent(true);
      toast.success(data.message || "Revisá tu correo");
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-lg border border-primary-light/30 p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image
                src="/no-image.png"
                alt="Karamba"
                width={200}
                height={64}
                className="h-14 sm:h-16 w-auto object-contain"
                priority
              />
            </div>
            <h1 className="text-xl font-bold text-warm-gray">
              Olvidé mi contraseña
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Te enviamos un enlace para elegir una nueva (revisá spam).
            </p>
          </div>

          {sent ? (
            <p className="text-sm text-gray-600 text-center mb-6">
              Si el email está en nuestra base, recibirás instrucciones en unos
              minutos.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-warm-gray mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm bg-soft-gray/30"
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? "Enviando…" : "Enviar enlace"}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link
              href="/login"
              className="text-primary-dark font-semibold hover:underline"
            >
              Volver a ingresar
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
