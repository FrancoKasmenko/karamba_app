"use client";

import { Suspense, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update: updateSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await signIn("credentials", {
      email: form.email.trim(),
      password: form.password,
      redirect: false,
    });

    if (res?.error) {
      setLoading(false);
      toast.error("Email o contrase\u00f1a incorrectos");
      return;
    }

    await updateSession();
    setLoading(false);
    toast.success("\u00a1Bienvenido/a!");
    router.push(safeNextPath(searchParams.get("callbackUrl")));
    router.refresh();
  };

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
              Ingresar
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Ingres&aacute; a tu cuenta
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-warm-gray mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm bg-soft-gray/30"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-warm-gray mb-1.5">
                Contrase&ntilde;a
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm bg-soft-gray/30"
                placeholder="Tu contraseña"
              />
            </div>

            <div className="text-right -mt-2">
              <Link
                href="/login/olvide-contrasena"
                className="text-sm font-medium text-primary-dark hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            &iquest;No ten&eacute;s cuenta?{" "}
            <Link
              href="/registro"
              className="text-primary-dark font-semibold hover:underline"
            >
              Registrate
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center px-4 text-gray-400 text-sm">
          Cargando…
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
