"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

function safeNextPath(raw: string | null): string {
  if (!raw) return "/admin";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/admin";
  return raw;
}

function Login2FAInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const callbackUrl = safeNextPath(searchParams.get("callbackUrl"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = code.trim().replace(/\s+/g, "");
    const digitsOnly = raw.replace(/\D/g, "");
    const payload =
      digitsOnly.length >= 6 && /^\d+$/.test(digitsOnly)
        ? digitsOnly.slice(0, 6)
        : raw.toUpperCase().slice(0, 24);
    if (payload.length < 6) {
      toast.error("Ingresá el código de 6 dígitos o un código de respaldo");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Código incorrecto");
        setLoading(false);
        return;
      }
      await update();
      toast.success("Verificación correcta");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-gray-400 text-sm">
        Cargando…
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.user?.twoFAPending) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 gap-4">
        <p className="text-gray-600 text-center text-sm">
          No hay un inicio de sesión pendiente de verificación en dos pasos.
        </p>
        <Link href="/login" className="text-primary font-semibold text-sm">
          Volver al login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-lg border border-primary-light/30 p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image
                src="/img/karamba.png"
                alt="Karamba"
                width={200}
                height={64}
                className="h-14 sm:h-16 w-auto object-contain"
                priority
              />
            </div>
            <h1 className="text-xl font-bold text-warm-gray">
              Verificación en dos pasos
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Ingresá el código de 6 dígitos de tu app Authenticator
              (Google/Microsoft) o un código de respaldo.
            </p>
            <p className="mt-1 text-xs text-gray-400">{session.user.email}</p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-warm-gray mb-1.5">
                Código
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm bg-soft-gray/30 tracking-widest text-center text-lg font-mono"
                placeholder="000000"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? "Verificando…" : "Confirmar"}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-center text-sm">
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/login" })}
              className="text-gray-500 hover:text-warm-gray"
            >
              Cancelar e iniciar sesión con otra cuenta
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Login2FAPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center text-gray-400 text-sm">
          Cargando…
        </div>
      }
    >
      <Login2FAInner />
    </Suspense>
  );
}
