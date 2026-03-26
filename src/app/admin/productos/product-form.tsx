"use client";
import { api } from "@/lib/public-api";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FiPlus, FiTrash2, FiUpload, FiX } from "react-icons/fi";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";
import { resolveStoredProductImage, isLocalUploadPath } from "@/lib/image-url";
import {
  DIGITAL_FILE_MAX_BYTES,
  MAX_DIGITAL_FILES_PER_PRODUCT,
} from "@/lib/digital-constants";

interface Variant {
  name: string;
  value: string;
  price?: number;
  stock?: number;
}

/** Lista plana desde GET /api/admin/categories (sin children anidados). */
interface CategoryRow {
  id: string;
  name: string;
  parentId: string | null;
}

function buildCategorySelectOptions(rows: CategoryRow[]): {
  id: string;
  label: string;
}[] {
  const byParent = new Map<string | null, CategoryRow[]>();
  for (const r of rows) {
    const k = r.parentId ?? null;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(r);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }
  const out: { id: string; label: string }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    const kids = byParent.get(parentId) ?? [];
    for (const c of kids) {
      out.push({
        id: c.id,
        label:
          depth > 0
            ? `${"  ".repeat(depth)}└ ${c.name}`
            : c.name,
      });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

interface DigitalFileRow {
  fileUrl: string;
  fileName: string;
}

interface ProductData {
  id?: string;
  name: string;
  description: string;
  price: string;
  comparePrice: string;
  images: string[];
  imageUrl: string;
  featured: boolean;
  active: boolean;
  categoryId: string;
  variants: Variant[];
  isDigital: boolean;
  digitalFiles: DigitalFileRow[];
}

const defaultProduct: ProductData = {
  name: "",
  description: "",
  price: "",
  comparePrice: "",
  images: [],
  imageUrl: "",
  featured: false,
  active: true,
  categoryId: "",
  variants: [],
  isDigital: false,
  digitalFiles: [],
};

export default function ProductForm({
  initialData,
}: {
  initialData?: Partial<ProductData> & {
    id?: string;
    variants?: Variant[];
    /** Compat: si no hay digitalFiles, se usa el primer archivo legacy */
    fileUrl?: string;
    fileName?: string;
  };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<ProductData>(() => ({
    ...defaultProduct,
    ...(initialData || {}),
    variants: initialData?.variants ?? defaultProduct.variants,
    isDigital: Boolean(initialData?.isDigital),
    digitalFiles:
      initialData?.digitalFiles?.length ?
        initialData.digitalFiles
      : initialData?.fileUrl ?
        [
          {
            fileUrl: initialData.fileUrl,
            fileName: initialData.fileName || "archivo",
          },
        ]
      : [],
    imageUrl: (initialData as ProductData | undefined)?.imageUrl ?? "",
  }));
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [uploadingDigital, setUploadingDigital] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const digitalFileRef = useRef<HTMLInputElement>(null);

  const isEdit = !!initialData?.id;

  useEffect(() => {
    fetch(api("/api/admin/categories"))
      .then((r) => r.json())
      .then((data) => setCategories(data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.isDigital && form.digitalFiles.length === 0) {
      toast.error("Subí al menos un archivo del producto digital");
      return;
    }
    setLoading(true);

    try {
      const path = isEdit
        ? `/api/admin/products/${initialData!.id}`
        : "/api/admin/products";

      const res = await fetch(api(path), {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: form.price,
          comparePrice: form.comparePrice,
          images: form.images,
          imageUrl: form.imageUrl,
          featured: form.featured,
          active: form.active,
          categoryId: form.categoryId,
          variants: form.variants,
          isDigital: form.isDigital,
          digitalFiles: form.isDigital ? form.digitalFiles : [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Error al guardar");
        setLoading(false);
        return;
      }

      toast.success(isEdit ? "Producto actualizado" : "Producto creado");
      router.push("/admin/productos");
      router.refresh();
    } catch {
      toast.error("Error al guardar");
    }

    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const res = await fetch(api("/api/upload"), {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        toast.error("Error al subir imágenes");
        setUploading(false);
        return;
      }

      const data = await res.json();
      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...data.urls],
      }));
      toast.success(`${data.urls.length} imagen(es) subida(s)`);
    } catch {
      toast.error("Error al subir imágenes");
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setForm({ ...form, images: form.images.filter((_, i) => i !== index) });
  };

  const handleDigitalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (form.digitalFiles.length >= MAX_DIGITAL_FILES_PER_PRODUCT) {
      toast.error(`Máximo ${MAX_DIGITAL_FILES_PER_PRODUCT} archivos por producto`);
      if (digitalFileRef.current) digitalFileRef.current.value = "";
      return;
    }
    if (file.size > DIGITAL_FILE_MAX_BYTES) {
      toast.error("Cada archivo puede pesar como máximo 80 MB");
      if (digitalFileRef.current) digitalFileRef.current.value = "";
      return;
    }
    setUploadingDigital(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(api("/api/admin/upload-digital"), {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al subir archivo");
        setUploadingDigital(false);
        return;
      }
      setForm((prev) => ({
        ...prev,
        digitalFiles: [
          ...prev.digitalFiles,
          {
            fileUrl: data.fileUrl,
            fileName: data.fileName || file.name,
          },
        ],
      }));
      toast.success("Archivo agregado");
    } catch {
      toast.error("Error al subir archivo");
    }
    setUploadingDigital(false);
    if (digitalFileRef.current) digitalFileRef.current.value = "";
  };

  const removeDigitalFile = (index: number) => {
    setForm((prev) => ({
      ...prev,
      digitalFiles: prev.digitalFiles.filter((_, i) => i !== index),
    }));
  };

  const addVariant = () => {
    setForm({
      ...form,
      variants: [...form.variants, { name: "", value: "", stock: 0 }],
    });
  };

  const updateVariant = (index: number, field: string, value: string | number) => {
    const variants = [...form.variants];
    variants[index] = { ...variants[index], [field]: value };
    setForm({ ...form, variants });
  };

  const removeVariant = (index: number) => {
    setForm({ ...form, variants: form.variants.filter((_, i) => i !== index) });
  };

  const flatCategories = buildCategorySelectOptions(categories);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Basic Info */}
      <div className="bg-white rounded-2xl border border-primary-light/30 p-6">
        <h2 className="font-display text-lg font-semibold text-gray-800 mb-4">
          Información Básica
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Producto
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio (UYU)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio anterior (opcional)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.comparePrice}
                onChange={(e) =>
                  setForm({ ...form, comparePrice: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Category selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
            >
              <option value="">Sin categoría</option>
              {flatCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Imagen principal (importador /{" "}
              <code className="text-xs">/api/uploads/products/…</code>)
            </label>
            <input
              type="text"
              value={form.imageUrl}
              onChange={(e) =>
                setForm({ ...form, imageUrl: e.target.value })
              }
              placeholder="ej: /api/uploads/products/mi-foto.jpg"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">
              Tiene prioridad sobre la galería. Vacío = solo galería.
            </p>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              Activo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) =>
                  setForm({ ...form, featured: e.target.checked })
                }
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              Destacado
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDigital}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm({
                    ...form,
                    isDigital: checked,
                    ...(checked ? {} : { digitalFiles: [] }),
                  });
                }}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              Producto digital descargable
            </label>
          </div>

          <p className="text-xs text-gray-500 -mt-2">
            Los cursos online grabados se crean en{" "}
            <strong>Admin → Cursos online</strong>; el producto de venta se
            genera automáticamente y no aparece en el listado de productos.
          </p>

          {form.isDigital && (
            <div className="mt-4 p-4 rounded-xl border border-secondary-light/40 bg-secondary-light/10 space-y-3">
              <p className="text-sm font-medium text-warm-gray">
                Archivos para el cliente (PDF, ZIP, imágenes u otros)
              </p>
              <p className="text-xs text-gray-500">
                Hasta {MAX_DIGITAL_FILES_PER_PRODUCT} archivos; cada uno hasta 80
                MB. La descarga solo está disponible tras el pago aprobado.
              </p>
              {form.digitalFiles.length > 0 && (
                <ul className="space-y-2">
                  {form.digitalFiles.map((f, i) => (
                    <li
                      key={`${f.fileUrl}-${i}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-gray-200/80 bg-white/60 px-3 py-2"
                    >
                      <span className="text-sm text-gray-700 truncate min-w-0">
                        {f.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeDigitalFile(i)}
                        className="p-1.5 text-gray-400 hover:text-red-500 shrink-0"
                        aria-label="Quitar archivo"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => digitalFileRef.current?.click()}
                  disabled={
                    uploadingDigital ||
                    form.digitalFiles.length >= MAX_DIGITAL_FILES_PER_PRODUCT
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary text-primary text-sm font-medium hover:bg-primary-light/20 disabled:opacity-50"
                >
                  <FiUpload size={16} />
                  {uploadingDigital
                    ? "Subiendo..."
                    : form.digitalFiles.length >= MAX_DIGITAL_FILES_PER_PRODUCT
                      ? "Límite de archivos alcanzado"
                      : "Agregar archivo"}
                </button>
              </div>
              <input
                ref={digitalFileRef}
                type="file"
                accept="application/pdf,application/zip,image/*,.zip,.rar,.7z"
                className="hidden"
                onChange={handleDigitalUpload}
              />
            </div>
          )}
        </div>
      </div>

      {/* Images */}
      <div className="bg-white rounded-2xl border border-primary-light/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-gray-800">
            Imágenes
          </h2>
          <span className="text-xs text-gray-400">
            {form.images.length} imagen(es)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {form.images.map((img, i) => (
            <div
              key={i}
              className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-soft-gray"
            >
              <Image
                src={resolveStoredProductImage(img)}
                alt={`Imagen ${i + 1}`}
                fill
                unoptimized={isLocalUploadPath(
                  resolveStoredProductImage(img)
                )}
                className="object-cover"
                sizes="200px"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              >
                <FiX size={14} />
              </button>
            </div>
          ))}

          {/* Upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-primary-light hover:border-primary flex flex-col items-center justify-center gap-2 text-primary/60 hover:text-primary hover:bg-primary-light/10 transition-all cursor-pointer"
          >
            {uploading ? (
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : (
              <FiPlus size={28} />
            )}
            <span className="text-xs font-medium">
              {uploading ? "Subiendo..." : "Agregar"}
            </span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Variants */}
      <div className="bg-white rounded-2xl border border-primary-light/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-gray-800">
            Variantes
          </h2>
          <Button type="button" onClick={addVariant} size="sm" variant="outline">
            <FiPlus className="mr-1" /> Agregar
          </Button>
        </div>

        {form.variants.length === 0 ? (
          <p className="text-sm text-gray-400">
            Sin variantes. Agregá color, tamaño, forma, etc.
          </p>
        ) : (
          <div className="space-y-3">
            {form.variants.map((variant, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Tipo (ej: Color)"
                    value={variant.name}
                    onChange={(e) => updateVariant(i, "name", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none text-sm"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Valor (ej: Rosa)"
                    value={variant.value}
                    onChange={(e) => updateVariant(i, "value", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none text-sm"
                  />
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    placeholder="Stock"
                    value={variant.stock || ""}
                    onChange={(e) =>
                      updateVariant(i, "stock", parseInt(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeVariant(i)}
                  className="p-2 text-gray-400 hover:text-red-500 mt-0.5"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading} size="lg">
          {loading
            ? "Guardando..."
            : isEdit
              ? "Actualizar Producto"
              : "Crear Producto"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
