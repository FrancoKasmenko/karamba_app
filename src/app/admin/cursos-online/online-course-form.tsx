"use client";
import { api } from "@/lib/public-api";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";
import { FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { resolveMediaPath, isLocalUploadPath } from "@/lib/image-url";

const MAX_COURSE_VIDEO_MB = 300;

type Lesson = {
  title: string;
  videoType: "EXTERNAL" | "UPLOAD";
  videoUrl: string;
  videoFile: string;
  content: string;
  order: number;
  durationMinutes: string;
};

type Module = {
  title: string;
  order: number;
  lessons: Lesson[];
};

type Resource = {
  title: string;
  fileUrl: string;
  order: number;
};

export type OnlineCourseFormInitial = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  price: string;
  level: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  isPublished: boolean;
  totalDurationMinutes: string;
  modules: Module[];
  resources: Resource[];
};

const emptyLesson = (): Lesson => ({
  title: "",
  videoType: "EXTERNAL",
  videoUrl: "",
  videoFile: "",
  content: "",
  order: 0,
  durationMinutes: "",
});

const emptyModule = (): Module => ({
  title: "",
  order: 0,
  lessons: [emptyLesson()],
});

export default function OnlineCourseForm({
  initial,
}: {
  initial: OnlineCourseFormInitial;
}) {
  const router = useRouter();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLessonKey, setUploadingLessonKey] = useState<string | null>(
    null
  );
  const [form, setForm] = useState<OnlineCourseFormInitial>(initial);
  const isEdit = !!initial.id;

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (coverInputRef.current) coverInputRef.current.value = "";
    if (!file) return;

    const okType =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      /\.(jpe?g|png)$/i.test(file.name);
    if (!okType) {
      toast.error("Solo se permiten imágenes JPG o PNG");
      return;
    }

    setUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const res = await fetch(api("/api/upload"), { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al subir la portada");
        setUploadingCover(false);
        return;
      }
      const url = data.urls?.[0] as string | undefined;
      if (url) {
        setForm((f) => ({ ...f, image: url }));
        toast.success("Portada subida");
      }
    } catch {
      toast.error("Error al subir la portada");
    }
    setUploadingCover(false);
  };

  const handleLessonVideoUpload = async (
    mi: number,
    li: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const okExt = file.name.toLowerCase().endsWith(".mp4");
    const okMime =
      !file.type ||
      file.type === "video/mp4" ||
      file.type === "video/x-m4v" ||
      file.type === "application/octet-stream";
    if (!okExt || !okMime) {
      toast.error("Solo se permiten archivos MP4");
      return;
    }

    const maxBytes = MAX_COURSE_VIDEO_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`El video no puede superar ${MAX_COURSE_VIDEO_MB} MB`);
      return;
    }

    const key = `${mi}-${li}`;
    setUploadingLessonKey(key);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(api("/api/upload/course-video"), {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al subir el video");
        setUploadingLessonKey(null);
        return;
      }
      const url = data.url as string | undefined;
      if (url) {
        setForm((f) => {
          const modules = [...f.modules];
          const mod = modules[mi];
          const lessons = [...mod.lessons];
          lessons[li] = {
            ...lessons[li],
            videoType: "UPLOAD",
            videoFile: url,
            videoUrl: "",
          };
          modules[mi] = { ...mod, lessons };
          return { ...f, modules };
        });
        toast.success("Video subido");
      }
    } catch {
      toast.error("Error al subir el video");
    }
    setUploadingLessonKey(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Título obligatorio");
      return;
    }
    setLoading(true);
    try {
      const path = isEdit
        ? `/api/admin/online-courses/${initial.id}`
        : "/api/admin/online-courses";
      const body = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || null,
        image: form.image.trim() || null,
        price: parseFloat(form.price) || 0,
        level: form.level,
        isPublished: form.isPublished,
        totalDurationMinutes: form.totalDurationMinutes.trim()
          ? parseInt(form.totalDurationMinutes, 10)
          : null,
        modules: form.modules.map((m, mi) => ({
          title: m.title.trim() || `Módulo ${mi + 1}`,
          order: mi,
          lessons: m.lessons.map((l, li) => ({
            title: l.title.trim() || `Clase ${li + 1}`,
            videoType: l.videoType,
            videoUrl: l.videoType === "EXTERNAL" ? l.videoUrl.trim() || null : null,
            videoFile: l.videoType === "UPLOAD" ? l.videoFile.trim() || null : null,
            content: l.content.trim() || null,
            order: li,
            durationMinutes: l.durationMinutes.trim()
              ? parseInt(l.durationMinutes, 10)
              : null,
          })),
        })),
        resources: form.resources.map((r, ri) => ({
          title: r.title.trim() || `Recurso ${ri + 1}`,
          fileUrl: r.fileUrl.trim(),
          order: ri,
        })),
      };

      const res = await fetch(api(path), {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.hint ? `${data.error}\n${data.hint}` : data.error;
        toast.error(detail || "Error al guardar", { duration: 6000 });
        setLoading(false);
        return;
      }
      toast.success(isEdit ? "Curso actualizado" : "Curso creado");
      router.push("/admin/cursos-online");
      router.refresh();
    } catch {
      toast.error("Error al guardar");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      <div className="bg-white rounded-2xl border border-primary-light/30 p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-gray-800">
          Datos generales
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título
            </label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug (opcional)
            </label>
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary outline-none text-sm font-mono text-xs"
              placeholder="auto desde título"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio referencia (UYU)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nivel
            </label>
            <select
              value={form.level}
              onChange={(e) =>
                setForm({
                  ...form,
                  level: e.target.value as OnlineCourseFormInitial["level"],
                })
              }
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary outline-none text-sm"
            >
              <option value="BASIC">Básico</option>
              <option value="INTERMEDIATE">Intermedio</option>
              <option value="ADVANCED">Avanzado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duración total (min, opcional)
            </label>
            <input
              type="number"
              value={form.totalDurationMinutes}
              onChange={(e) =>
                setForm({ ...form, totalDurationMinutes: e.target.value })
              }
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary outline-none text-sm"
              placeholder="ej: 120"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Portada del curso
            </label>
            <div className="flex flex-wrap items-start gap-4">
              {form.image.trim() ? (
                <div className="relative w-36 h-48 rounded-xl overflow-hidden border border-gray-200 bg-soft-gray shrink-0">
                  <Image
                    src={resolveMediaPath(form.image.trim())}
                    alt="Portada"
                    fill
                    unoptimized={isLocalUploadPath(
                      resolveMediaPath(form.image.trim())
                    )}
                    className="object-cover"
                    sizes="144px"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, image: "" })}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center opacity-90 hover:opacity-100 shadow-md"
                    aria-label="Quitar portada"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="w-36 h-48 rounded-xl border-2 border-dashed border-primary/35 hover:border-primary hover:bg-primary-light/10 flex flex-col items-center justify-center gap-2 text-primary/70 hover:text-primary transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {uploadingCover ? (
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <>
                    <FiPlus size={32} strokeWidth={1.5} />
                    <span className="text-xs font-medium text-center px-2">
                      Subir JPG o PNG
                    </span>
                  </>
                )}
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleCoverUpload}
              />
              <div className="flex-1 min-w-[min(100%,220px)]">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  O pegá una URL / ruta
                </label>
                <input
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="/api/uploads/… o https://…"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary outline-none text-sm font-mono text-xs"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              La portada se muestra en el catálogo y en la ficha del curso. Solo
              JPG o PNG.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary outline-none text-sm resize-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) =>
                setForm({ ...form, isPublished: e.target.checked })
              }
              className="rounded border-gray-300 text-primary"
            />
            Publicado en la tienda (/cursos-online)
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-primary-light/30 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-gray-800">
            Módulos y clases
          </h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setForm((f) => ({
                ...f,
                modules: [...f.modules, emptyModule()],
              }));
            }}
          >
            <FiPlus className="mr-1" /> Módulo
          </Button>
        </div>

        {form.modules.length === 0 ? (
          <p className="text-sm text-gray-400">Sin módulos.</p>
        ) : (
          <div className="space-y-6">
            {form.modules.map((mod, mi) => (
              <div
                key={mi}
                className="border border-gray-200 rounded-xl p-4 space-y-3 bg-soft-gray/40"
              >
                <div className="flex gap-2 items-start">
                  <input
                    placeholder="Título del módulo"
                    value={mod.title}
                    onChange={(e) => {
                      const modules = [...form.modules];
                      modules[mi] = { ...mod, title: e.target.value };
                      setForm({ ...form, modules });
                    }}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                  <button
                    type="button"
                    className="p-2 text-gray-400 hover:text-red-500"
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        modules: f.modules.filter((_, i) => i !== mi),
                      }));
                    }}
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
                <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                  {mod.lessons.map((les, li) => (
                    <div
                      key={li}
                      className="bg-white rounded-lg p-3 space-y-2 border border-gray-100"
                    >
                      <div className="flex gap-2">
                        <input
                          placeholder="Título de la clase"
                          value={les.title}
                          onChange={(e) => {
                            const modules = [...form.modules];
                            const lessons = [...mod.lessons];
                            lessons[li] = { ...les, title: e.target.value };
                            modules[mi] = { ...mod, lessons };
                            setForm({ ...form, modules });
                          }}
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                        <button
                          type="button"
                          className="p-2 text-gray-400 hover:text-red-500"
                          onClick={() => {
                            const modules = [...form.modules];
                            const lessons = mod.lessons.filter(
                              (_, i) => i !== li
                            );
                            modules[mi] = { ...mod, lessons };
                            setForm({ ...form, modules });
                          }}
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[11px] font-medium text-gray-500">
                          Tipo de video
                        </label>
                        <select
                          value={les.videoType}
                          onChange={(e) => {
                            const vt = e.target.value as Lesson["videoType"];
                            const modules = [...form.modules];
                            const lessons = [...mod.lessons];
                            lessons[li] = {
                              ...les,
                              videoType: vt,
                              ...(vt === "EXTERNAL"
                                ? { videoFile: "" }
                                : { videoUrl: "" }),
                            };
                            modules[mi] = { ...mod, lessons };
                            setForm({ ...form, modules });
                          }}
                          className="w-full max-w-md px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        >
                          <option value="EXTERNAL">
                            Enlace externo (YouTube / Vimeo)
                          </option>
                          <option value="UPLOAD">Archivo MP4 subido</option>
                        </select>
                        {les.videoType === "EXTERNAL" ? (
                          <input
                            placeholder="URL del video (YouTube / Vimeo)"
                            value={les.videoUrl}
                            onChange={(e) => {
                              const modules = [...form.modules];
                              const lessons = [...mod.lessons];
                              lessons[li] = {
                                ...les,
                                videoUrl: e.target.value,
                              };
                              modules[mi] = { ...mod, lessons };
                              setForm({ ...form, modules });
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-mono"
                          />
                        ) : (
                          <div className="space-y-2">
                            {les.videoFile.trim() ? (
                              <div className="flex flex-wrap items-center gap-2 text-xs font-mono bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                <span className="truncate flex-1 min-w-0">
                                  {les.videoFile}
                                </span>
                                <button
                                  type="button"
                                  className="text-red-500 hover:underline shrink-0"
                                  onClick={() => {
                                    const modules = [...form.modules];
                                    const lessons = [...mod.lessons];
                                    lessons[li] = { ...les, videoFile: "" };
                                    modules[mi] = { ...mod, lessons };
                                    setForm({ ...form, modules });
                                  }}
                                >
                                  Quitar
                                </button>
                              </div>
                            ) : null}
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="inline-flex">
                                <span className="px-3 py-2 rounded-lg border border-primary/40 text-sm font-medium text-primary cursor-pointer hover:bg-primary-light/20">
                                  {uploadingLessonKey === `${mi}-${li}`
                                    ? "Subiendo…"
                                    : "Subir MP4"}
                                </span>
                                <input
                                  type="file"
                                  accept="video/mp4,.mp4"
                                  className="hidden"
                                  disabled={uploadingLessonKey === `${mi}-${li}`}
                                  onChange={(ev) =>
                                    void handleLessonVideoUpload(mi, li, ev)
                                  }
                                />
                              </label>
                              <span className="text-[11px] text-gray-400">
                                Máx. {MAX_COURSE_VIDEO_MB} MB · solo MP4 →{" "}
                                /public/uploads/course-videos/
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <input
                        type="number"
                        placeholder="Duración clase (min)"
                        value={les.durationMinutes}
                        onChange={(e) => {
                          const modules = [...form.modules];
                          const lessons = [...mod.lessons];
                          lessons[li] = {
                            ...les,
                            durationMinutes: e.target.value,
                          };
                          modules[mi] = { ...mod, lessons };
                          setForm({ ...form, modules });
                        }}
                        className="w-full max-w-xs px-3 py-2 rounded-lg border border-gray-200 text-sm"
                      />
                      <textarea
                        placeholder="Texto / notas (opcional)"
                        rows={2}
                        value={les.content}
                        onChange={(e) => {
                          const modules = [...form.modules];
                          const lessons = [...mod.lessons];
                          lessons[li] = { ...les, content: e.target.value };
                          modules[mi] = { ...mod, lessons };
                          setForm({ ...form, modules });
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none"
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const modules = [...form.modules];
                      modules[mi] = {
                        ...mod,
                        lessons: [...mod.lessons, emptyLesson()],
                      };
                      setForm({ ...form, modules });
                    }}
                  >
                    <FiPlus size={14} className="mr-1" /> Clase
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-primary-light/30 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-gray-800">
            Recursos descargables
          </h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setForm((f) => ({
                ...f,
                resources: [
                  ...f.resources,
                  { title: "", fileUrl: "", order: f.resources.length },
                ],
              }))
            }
          >
            <FiPlus className="mr-1" /> Recurso
          </Button>
        </div>
        {form.resources.map((res, ri) => (
          <div key={ri} className="flex flex-col sm:flex-row gap-2">
            <input
              placeholder="Título"
              value={res.title}
              onChange={(e) => {
                const resources = [...form.resources];
                resources[ri] = { ...res, title: e.target.value };
                setForm({ ...form, resources });
              }}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
            <input
              placeholder="URL archivo (/api/uploads/… o externa)"
              value={res.fileUrl}
              onChange={(e) => {
                const resources = [...form.resources];
                resources[ri] = { ...res, fileUrl: e.target.value };
                setForm({ ...form, resources });
              }}
              className="flex-[2] px-3 py-2 rounded-lg border border-gray-200 text-xs font-mono"
            />
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-red-500 self-start"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  resources: f.resources.filter((_, i) => i !== ri),
                }))
              }
            >
              <FiTrash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading} size="lg">
          {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear curso"}
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
