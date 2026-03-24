"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { isLocalUploadPath } from "@/lib/image-url";
import { FiUpload, FiX, FiLoader } from "react-icons/fi";

interface CourseFormProps {
  initialData?: {
    id?: string;
    title: string;
    description: string;
    price: number;
    image: string;
    duration: string;
    courseType: string;
    published: boolean;
  };
}

export default function CourseForm({ initialData }: CourseFormProps) {
  const router = useRouter();
  const isEditing = !!initialData?.id;

  const [form, setForm] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    price: initialData?.price || 0,
    image: initialData?.image || "",
    duration: initialData?.duration || "",
    courseType: initialData?.courseType || "PRESENCIAL",
    published: initialData?.published || false,
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("files", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.urls?.[0]) setForm((f) => ({ ...f, image: data.urls[0] }));
    } catch {
      alert("Error al subir imagen");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return alert("El título es obligatorio");
    setSaving(true);

    try {
      const url = isEditing
        ? `/api/admin/courses/${initialData!.id}`
        : "/api/admin/courses";

      await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      router.push("/admin/cursos");
      router.refresh();
    } catch {
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Título *
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          placeholder="Ej: Taller de MDF decorativo"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={5}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
          placeholder="Describí el curso, qué se va a aprender, materiales incluidos..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio (UYU) *
          </label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            min={0}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duración
          </label>
          <input
            type="text"
            value={form.duration}
            onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            placeholder="Ej: 3 horas"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Modalidad *
          </label>
          <select
            value={form.courseType}
            onChange={(e) => setForm((f) => ({ ...f, courseType: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
          >
            <option value="PRESENCIAL">Presencial</option>
            <option value="VIRTUAL">Virtual</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Imagen
        </label>
        {form.image ? (
          <div className="relative w-full max-w-xs aspect-[16/10] rounded-xl overflow-hidden border border-gray-200">
            <Image
              src={form.image}
              alt="Preview"
              fill
              unoptimized={isLocalUploadPath(form.image)}
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, image: "" }))}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <FiX size={14} />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 w-full max-w-xs aspect-[16/10] rounded-xl border-2 border-dashed border-gray-300 hover:border-primary cursor-pointer transition-colors">
            {uploading ? (
              <FiLoader className="animate-spin text-primary" size={24} />
            ) : (
              <>
                <FiUpload className="text-gray-400" />
                <span className="text-sm text-gray-400">Subir imagen</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="published"
          checked={form.published}
          onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
          className="w-4 h-4 text-primary rounded border-gray-300"
        />
        <label htmlFor="published" className="text-sm font-medium text-gray-700">
          Publicar curso (visible para usuarios)
        </label>
      </div>

      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-white px-6 py-2.5 rounded-full font-semibold hover:bg-primary-dark disabled:opacity-50 transition-all flex items-center gap-2"
        >
          {saving && <FiLoader className="animate-spin" size={14} />}
          {isEditing ? "Guardar cambios" : "Crear curso"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/cursos")}
          className="text-gray-500 hover:text-warm-gray px-4 py-2.5 text-sm"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
