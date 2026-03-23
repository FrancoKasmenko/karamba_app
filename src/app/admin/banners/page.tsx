"use client";

import { useEffect, useState } from "react";
import { FiPlus, FiTrash2, FiEdit, FiCheck, FiX } from "react-icons/fi";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  image: string;
  order: number;
  active: boolean;
}

const emptyBanner = {
  title: "",
  subtitle: "",
  buttonText: "",
  buttonLink: "",
  image: "",
  active: true,
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyBanner);

  const fetchBanners = async () => {
    const res = await fetch("/api/admin/banners");
    setBanners(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleSave = async () => {
    try {
      if (editing) {
        await fetch(`/api/admin/banners/${editing}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        toast.success("Banner actualizado");
      } else {
        await fetch("/api/admin/banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        toast.success("Banner creado");
      }
      setEditing(null);
      setCreating(false);
      setForm(emptyBanner);
      fetchBanners();
    } catch {
      toast.error("Error al guardar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("\u00bfEliminar este banner?")) return;
    await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    toast.success("Banner eliminado");
    fetchBanners();
  };

  const startEdit = (banner: Banner) => {
    setEditing(banner.id);
    setCreating(false);
    setForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      buttonText: banner.buttonText || "",
      buttonLink: banner.buttonLink || "",
      image: banner.image,
      active: banner.active,
    });
  };

  const cancel = () => {
    setEditing(null);
    setCreating(false);
    setForm(emptyBanner);
  };

  if (loading) return <div className="text-gray-400 py-10">Cargando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-warm-gray">Banners</h1>
        <Button
          onClick={() => {
            setCreating(true);
            setEditing(null);
            setForm(emptyBanner);
          }}
          size="sm"
        >
          <FiPlus className="mr-1" /> Nuevo
        </Button>
      </div>

      {(creating || editing) && (
        <div className="bg-white rounded-2xl border border-primary-light/30 p-6 mb-6">
          <h3 className="font-bold text-warm-gray mb-4">
            {editing ? "Editar Banner" : "Nuevo Banner"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="T\u00edtulo (opcional)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary"
            />
            <input
              type="text"
              placeholder="Subt\u00edtulo (opcional)"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary"
            />
            <input
              type="url"
              placeholder="URL de imagen *"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary"
            />
            <input
              type="text"
              placeholder="Texto del bot\u00f3n (opcional)"
              value={form.buttonText}
              onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary"
            />
            <input
              type="text"
              placeholder="Link del bot\u00f3n (ej: /productos)"
              value={form.buttonLink}
              onChange={(e) => setForm({ ...form, buttonLink: e.target.value })}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Activo
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave} size="sm" disabled={!form.image}>
              <FiCheck className="mr-1" /> Guardar
            </Button>
            <Button onClick={cancel} size="sm" variant="ghost">
              <FiX className="mr-1" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      {banners.length === 0 ? (
        <p className="text-gray-400 text-center py-10">
          No hay banners. Cre\u00e1 el primero.
        </p>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="bg-white rounded-xl border border-primary-light/30 p-4 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-warm-gray truncate">
                  {banner.title || "(Sin t\u00edtulo)"}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {banner.image}
                </p>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  banner.active
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {banner.active ? "Activo" : "Inactivo"}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => startEdit(banner)}
                  className="p-2 text-gray-400 hover:text-primary"
                >
                  <FiEdit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(banner.id)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
