"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

function RestablecerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error("Enlace inválido");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo actualizar");
        return;
      }
      toast.success("Contraseña actualizada. Ya podés ingresar.");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-gray-600">
          Falta el token del enlace. Abrí el link que te enviamos por correo o
          solicitá uno nuevo.
        </p>
        <Link
          href="/login/olvide-contrasena"
          className="text-primary-dark font-semibold text-sm hover:underline inline-block"
        >
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-warm-gray mb-1.5">
          Nueva contraseña
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm bg-soft-gray/30"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-warm-gray mb-1.5">
          Confirmar contraseña
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm bg-soft-gray/30"
          placeholder="Repetí la contraseña"
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}

export default function RestablecerContrasenaPage() {
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
              Nueva contraseña
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Elegí una contraseña segura para tu cuenta.
            </p>
          </div>

          <Suspense
            fallback={
              <p className="text-center text-sm text-gray-400">Cargando…</p>
            }
          >
            <RestablecerInner />
          </Suspense>

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
