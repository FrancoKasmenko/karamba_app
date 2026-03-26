"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import Button from "@/components/ui/button";
import { FiUserPlus } from "react-icons/fi";

export default function GrantOnlineAccessCard({
  courseId,
}: {
  courseId: string;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em) {
      toast.error("Ingresá el email de la cuenta");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/online-courses/${courseId}/grant-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "No se pudo otorgar el acceso");
        return;
      }
      if (data.alreadyHadAccess) {
        toast.success("Esa cuenta ya tenía acceso a este curso");
      } else {
        toast.success("Acceso otorgado. La alumna verá el curso en Mi aprendizaje.");
      }
      setEmail("");
    } catch {
      toast.error("Error de red");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-10 rounded-2xl border border-primary-light/35 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-warm-gray mb-1 flex items-center gap-2">
        <FiUserPlus className="text-primary" />
        Acceso manual (alumna ya registrada)
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Otorgá acceso al curso online a una usuaria que ya tenga cuenta en el sitio
        (mismo email que usó al registrarse). Se crea una orden interna en $0 para
        dejar registro del acceso.
      </p>
      <form onSubmit={(e) => void submit(e)} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@ejemplo.com"
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
          disabled={busy}
        />
        <Button type="submit" disabled={busy} size="sm" className="shrink-0">
          {busy ? "…" : "Dar acceso"}
        </Button>
      </form>
    </div>
  );
}
