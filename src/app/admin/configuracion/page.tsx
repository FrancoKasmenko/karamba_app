"use client";
import { api } from "@/lib/public-api";

import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

interface Settings {
  siteName: string;
  siteDescription: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
  instagramFeedManual: string;
  welcomeCouponCode: string;
}

export default function AdminConfigPage() {
  const [form, setForm] = useState<Settings>({
    siteName: "Karamba",
    siteDescription: "",
    contactEmail: "",
    contactPhone: "",
    contactAddress: "",
    instagram: "",
    facebook: "",
    whatsapp: "",
    instagramFeedManual: "[]",
    welcomeCouponCode: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(api("/api/admin/settings"))
      .then((r) => r.json())
      .then((data) => {
        const rawManual = (data as { instagramFeedManual?: unknown })
          .instagramFeedManual;
        const manualStr =
          rawManual == null
            ? "[]"
            : typeof rawManual === "string"
              ? rawManual
              : JSON.stringify(rawManual, null, 2);
        setForm({
          siteName: data.siteName || "Karamba",
          siteDescription: data.siteDescription || "",
          contactEmail: data.contactEmail || "",
          contactPhone: data.contactPhone || "",
          contactAddress: data.contactAddress || "",
          instagram: data.instagram || "",
          facebook: data.facebook || "",
          whatsapp: data.whatsapp || "",
          instagramFeedManual: manualStr,
          welcomeCouponCode:
            typeof (data as { welcomeCouponCode?: string }).welcomeCouponCode ===
            "string"
              ? (data as { welcomeCouponCode: string }).welcomeCouponCode
              : "",
        });
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(api("/api/admin/settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const saved = await res.json();
      if (!res.ok) {
        toast.error(saved?.error || "Error al guardar");
        setSaving(false);
        return;
      }
      const rawManual = (saved as { instagramFeedManual?: unknown })
        .instagramFeedManual;
      if (rawManual != null) {
        setForm((f) => ({
          ...f,
          instagramFeedManual:
            typeof rawManual === "string"
              ? rawManual
              : JSON.stringify(rawManual, null, 2),
        }));
      }
      const warns = (saved as { instagramFeedSyncWarnings?: string[] })
        .instagramFeedSyncWarnings;
      if (warns?.length) {
        toast(warns.join(" · "), { duration: 8000, icon: "⚠️" });
      }
      toast.success("Configuración guardada");
    } catch {
      toast.error("Error al guardar");
    }

    setSaving(false);
  };

  if (loading) return <div className="text-gray-400 py-10">Cargando...</div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-800 mb-6">
        Configuración General
      </h1>

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        <div className="bg-white rounded-2xl border border-primary-light/30 p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-gray-800">
            Sitio
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del sitio
            </label>
            <input
              type="text"
              value={form.siteName}
              onChange={(e) => setForm({ ...form, siteName: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              rows={3}
              value={form.siteDescription || ""}
              onChange={(e) =>
                setForm({ ...form, siteDescription: e.target.value })
              }
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm resize-none"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-primary-light/30 p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-gray-800">
            Contacto
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.contactEmail || ""}
                onChange={(e) =>
                  setForm({ ...form, contactEmail: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={form.contactPhone || ""}
                onChange={(e) =>
                  setForm({ ...form, contactPhone: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <input
                type="text"
                value={form.contactAddress || ""}
                onChange={(e) =>
                  setForm({ ...form, contactAddress: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-primary-light/30 p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-gray-800">
            Cupón de bienvenida (clientes nuevos)
          </h2>
          <p className="text-sm text-gray-500">
            Creá el cupón en{" "}
            <span className="font-medium text-gray-700">Admin → Cupones</span>.
            El código que indiques acá se incluye en el correo automático cuando
            alguien se registra (solo si el cupón existe y está activo).
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código del cupón
            </label>
            <input
              type="text"
              value={form.welcomeCouponCode}
              onChange={(e) =>
                setForm({ ...form, welcomeCouponCode: e.target.value })
              }
              placeholder="Ej. BIENVENIDA10"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm font-mono uppercase"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-primary-light/30 p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-gray-800">
            Redes Sociales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instagram
              </label>
              <input
                type="text"
                value={form.instagram || ""}
                onChange={(e) =>
                  setForm({ ...form, instagram: e.target.value })
                }
                placeholder="@karamba"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feed Instagram (manual, JSON)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Solo con enlaces de Instagram: al guardar se descargan las
                miniaturas a{" "}
                <code className="bg-gray-100 px-1 rounded">/api/uploads/instagram/</code>
                . Podés usar solo{" "}
                <code className="bg-gray-100 px-1 rounded">url</code>. Otras URLs
                necesitan <code className="bg-gray-100 px-1 rounded">image</code>
                . <code className="bg-gray-100 px-1 rounded">skipInstagramDownload</code>
                : true evita la descarga.
              </p>
              <textarea
                rows={8}
                value={form.instagramFeedManual}
                onChange={(e) =>
                  setForm({ ...form, instagramFeedManual: e.target.value })
                }
                placeholder='[{"url":"https://www.instagram.com/p/XXXX/"}]'
                spellCheck={false}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm font-mono resize-y min-h-[140px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facebook
              </label>
              <input
                type="text"
                value={form.facebook || ""}
                onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp
              </label>
              <input
                type="text"
                value={form.whatsapp || ""}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="+598 99 123 456"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={saving} size="lg">
          {saving ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </form>
    </div>
  );
}
