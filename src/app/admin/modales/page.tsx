"use client";
import { api } from "@/lib/public-api";

import { useEffect, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import Button from "@/components/ui/button";
import { resolveMediaPath, isLocalUploadPath } from "@/lib/image-url";
import { FiPlus, FiTrash2, FiEdit, FiCheck, FiX, FiUpload } from "react-icons/fi";

interface SiteModal {
  id: string;
  name: string;
  active: boolean;
  frequency: string;
  showAgainAfterDays: number | null;
  layout: string;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  dismissLabel: string;
  sortOrder: number;
}

const empty = {
  name: "",
  active: true,
  frequency: "ONCE_PER_BROWSER",
  showAgainAfterDays: "7",
  layout: "TEXT_LOGO",
  title: "",
  body: "",
  imageUrl: "",
  ctaLabel: "",
  ctaHref: "",
  dismissLabel: "Cerrar",
  sortOrder: "0",
};

export default function AdminModalesPage() {
  const [modals, setModals] = useState<SiteModal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(empty);
  const [imageUploading, setImageUploading] = useState(false);

  const load = () => {
    fetch(api("/api/admin/site-modals"))
      .then((r) => r.json())
      .then((d) => setModals(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Error al cargar"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = () => {
    setEditing(null);
    setCreating(false);
    setForm(empty);
  };

  const startEdit = (m: SiteModal) => {
    setEditing(m.id);
    setCreating(false);
    setForm({
      name: m.name,
      active: m.active,
      frequency: m.frequency,
      showAgainAfterDays: String(m.showAgainAfterDays ?? 7),
      layout: m.layout,
      title: m.title || "",
      body: m.body || "",
      imageUrl: m.imageUrl || "",
      ctaLabel: m.ctaLabel || "",
      ctaHref: m.ctaHref || "",
      dismissLabel: m.dismissLabel || "Cerrar",
      sortOrder: String(m.sortOrder),
    });
  };

  const save = async () => {
    const payload = {
      name: form.name.trim(),
      active: form.active,
      frequency: form.frequency,
      showAgainAfterDays:
        form.frequency === "AGAIN_AFTER_DAYS"
          ? Number(form.showAgainAfterDays) || 7
          : null,
      layout: form.layout,
      title: form.title.trim() || null,
      body: form.body.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      ctaLabel: form.ctaLabel.trim() || null,
      ctaHref: form.ctaHref.trim() || null,
      dismissLabel: form.dismissLabel.trim() || "Cerrar",
      sortOrder: Number(form.sortOrder) || 0,
    };
    if (!payload.name) {
      toast.error("Nombre requerido");
      return;
    }

    try {
      if (editing) {
        const res = await fetch(api(`/api/admin/site-modals/${editing}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error || "Error al guardar");
          return;
        }
        toast.success("Modal actualizado");
      } else {
        const res = await fetch(api("/api/admin/site-modals"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error || "Error al crear");
          return;
        }
        toast.success("Modal creado");
      }
      cancel();
      load();
    } catch {
      toast.error("Error de red");
    }
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(api("/api/admin/site-modals/upload"), {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al subir");
        return;
      }
      setForm((f) => ({ ...f, imageUrl: data.url }));
      toast.success("Imagen subida");
    } catch {
      toast.error("Error al subir");
    } finally {
      setImageUploading(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("¿Eliminar este modal?")) return;
    const res = await fetch(api(`/api/admin/site-modals/${id}`), { method: "DELETE" });
    if (res.ok) {
      toast.success("Eliminado");
      load();
    } else toast.error("No se pudo eliminar");
  };

  if (loading) {
    return <p className="text-gray-400 py-10">Cargando…</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-warm-gray">Modales del sitio</h1>
        <Button
          size="sm"
          onClick={() => {
            setCreating(true);
            setEditing(null);
            setForm(empty);
          }}
        >
          <FiPlus className="mr-1" /> Nuevo
        </Button>
      </div>

      <p className="text-sm text-gray-500 mb-6 max-w-3xl">
        Se muestra un modal a la vez (el de menor orden). Frecuencia: una vez por
        navegador, cada sesión del navegador, o repetir cada N días tras cerrar.
        Diseño &quot;Texto + logo&quot; o &quot;Imagen + texto&quot; (subí la
        imagen con el botón de archivo en el formulario).
      </p>

      {(creating || editing) && (
        <div className="bg-white rounded-2xl border border-primary-light/30 p-6 mb-8 space-y-4">
          <h2 className="font-bold text-warm-gray">
            {editing ? "Editar modal" : "Nuevo modal"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary sm:col-span-2"
              placeholder="Nombre interno"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
              />
              Activo
            </label>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Frecuencia
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                value={form.frequency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, frequency: e.target.value }))
                }
              >
                <option value="ONCE_PER_BROWSER">Una vez por navegador</option>
                <option value="EVERY_SESSION">Cada sesión (hasta cerrar pestaña/navegador)</option>
                <option value="AGAIN_AFTER_DAYS">Volver a mostrar cada N días</option>
              </select>
            </div>
            {form.frequency === "AGAIN_AFTER_DAYS" && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Días entre apariciones
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  value={form.showAgainAfterDays}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, showAgainAfterDays: e.target.value }))
                  }
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Diseño
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                value={form.layout}
                onChange={(e) =>
                  setForm((f) => ({ ...f, layout: e.target.value }))
                }
              >
                <option value="TEXT_LOGO">Texto con logo Karamba</option>
                <option value="IMAGE_TEXT">Imagen + texto</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Orden (menor = primero)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sortOrder: e.target.value }))
                }
              />
            </div>
            <input
              className="sm:col-span-2 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary"
              placeholder="Título (opcional)"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <textarea
              className="sm:col-span-2 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary min-h-[100px]"
              placeholder="Texto (opcional)"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
            <div className="sm:col-span-2 space-y-2">
              <p className="text-xs font-semibold text-gray-500">
                Imagen del modal (layout &quot;Imagen + texto&quot;)
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-primary/40 bg-primary-light/10 text-sm text-warm-gray cursor-pointer hover:bg-primary-light/20">
                  <FiUpload size={16} />
                  {imageUploading ? "Subiendo…" : "Subir imagen"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={imageUploading}
                    onChange={(e) => void handleImageFile(e)}
                  />
                </label>
                {form.imageUrl.trim() && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                    className="text-xs font-semibold text-red-500 hover:text-red-600"
                  >
                    Quitar imagen
                  </button>
                )}
              </div>
              <span className="text-xs text-gray-400 block">
                JPG, PNG, WebP o GIF · máx. 8 MB · se guarda en{" "}
                <code className="text-gray-600">/api/uploads/site-modals/…</code>
              </span>
              {form.imageUrl.trim() && (
                <div className="relative w-full max-w-xs aspect-[16/10] rounded-xl overflow-hidden border border-gray-200 bg-soft-gray mt-2">
                  <Image
                    src={
                      resolveMediaPath(form.imageUrl.trim()) || form.imageUrl.trim()
                    }
                    alt="Vista previa"
                    fill
                    unoptimized={isLocalUploadPath(
                      resolveMediaPath(form.imageUrl.trim()) ||
                        form.imageUrl.trim()
                    )}
                    className="object-cover"
                  />
                </div>
              )}
            </div>
            <input
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary"
              placeholder="Texto botón CTA (opcional)"
              value={form.ctaLabel}
              onChange={(e) =>
                setForm((f) => ({ ...f, ctaLabel: e.target.value }))
              }
            />
            <input
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary"
              placeholder="Enlace del CTA (opcional)"
              value={form.ctaHref}
              onChange={(e) =>
                setForm((f) => ({ ...f, ctaHref: e.target.value }))
              }
            />
            <input
              className="sm:col-span-2 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary"
              placeholder="Texto cerrar"
              value={form.dismissLabel}
              onChange={(e) =>
                setForm((f) => ({ ...f, dismissLabel: e.target.value }))
              }
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void save()}>
              <FiCheck className="mr-1" /> Guardar
            </Button>
            <Button size="sm" variant="ghost" onClick={cancel}>
              <FiX className="mr-1" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {modals.length === 0 ? (
          <p className="text-gray-400 text-center py-10">No hay modales.</p>
        ) : (
          modals.map((m) => (
            <div
              key={m.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl border border-primary-light/25 p-4"
            >
              <div>
                <p className="font-semibold text-warm-gray">{m.name}</p>
                <p className="text-xs text-gray-500">
                  {m.frequency}
                  {m.frequency === "AGAIN_AFTER_DAYS" && m.showAgainAfterDays
                    ? ` · ${m.showAgainAfterDays} días`
                    : ""}{" "}
                  · {m.layout} · orden {m.sortOrder}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    m.active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {m.active ? "Activo" : "Inactivo"}
                </span>
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-primary"
                  onClick={() => startEdit(m)}
                >
                  <FiEdit size={16} />
                </button>
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-red-500"
                  onClick={() => void del(m.id)}
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
