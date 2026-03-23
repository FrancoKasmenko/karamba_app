"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiChevronLeft, FiCheck, FiMenu, FiX, FiDownload } from "react-icons/fi";
import LessonVideoPlayer from "@/components/learning/lesson-video-player";
import CourseCertificateButton from "@/components/learning/course-certificate-button";
import Button from "@/components/ui/button";
import { resolveMediaPath } from "@/lib/image-url";

type Lesson = {
  id: string;
  title: string;
  videoUrl: string | null;
  content: string | null;
  order: number;
};

type Mod = {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
};

type Resource = { id: string; title: string; fileUrl: string };

type CoursePayload = {
  id: string;
  title: string;
  slug: string;
  modules: Mod[];
  resources: Resource[];
};

export default function LearningPlayer({
  course,
  initialLessonId,
  completedLessonIds: initialCompleted,
  progressPercent: initialProgress,
  lastLessonId,
  courseDbId,
  certificateEligible,
}: {
  course: CoursePayload;
  initialLessonId: string | null;
  completedLessonIds: string[];
  progressPercent: number;
  lastLessonId: string | null;
  courseDbId: string;
  certificateEligible: boolean;
}) {
  const flat = useMemo(
    () =>
      course.modules.flatMap((m) =>
        m.lessons.map((l) => ({
          ...l,
          moduleTitle: m.title,
        }))
      ),
    [course.modules]
  );

  const [activeId, setActiveId] = useState<string | null>(
    initialLessonId || flat[0]?.id || null
  );
  const [completed, setCompleted] = useState<Set<string>>(
    () => new Set(initialCompleted)
  );
  const [progress, setProgress] = useState(initialProgress);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeLesson = flat.find((l) => l.id === activeId) || flat[0];
  const activeIndex = flat.findIndex((l) => l.id === activeLesson?.id);

  const postProgress = useCallback(
    async (opts: {
      lessonId: string;
      completed?: boolean;
      lastViewed?: boolean;
    }) => {
      setSaving(true);
      try {
        const res = await fetch("/api/learning/lesson-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId: opts.lessonId,
            completed: opts.completed ?? false,
            lastViewed: opts.lastViewed ?? false,
          }),
        });
        const data = await res.json();
        if (res.ok && typeof data.progress === "number") {
          setProgress(data.progress);
        }
      } finally {
        setSaving(false);
      }
    },
    []
  );

  useEffect(() => {
    const id = initialLessonId || flat[0]?.id;
    if (!id) return;
    void postProgress({ lessonId: id, lastViewed: true });
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectLesson = (id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
    void postProgress({ lessonId: id, lastViewed: true });
  };

  const markComplete = async () => {
    if (!activeLesson) return;
    const id = activeLesson.id;
    setCompleted((prev) => new Set([...prev, id]));
    await postProgress({ lessonId: id, completed: true, lastViewed: true });
    const next = flat[activeIndex + 1];
    if (next) {
      setActiveId(next.id);
      void postProgress({ lessonId: next.id, lastViewed: true });
    }
  };

  const continueLast = () => {
    if (lastLessonId && flat.some((l) => l.id === lastLessonId)) {
      selectLesson(lastLessonId);
    } else if (flat[0]) {
      selectLesson(flat[0].id);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-soft-gray/50">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
        <Link
          href={`/curso/${course.slug}`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-primary"
        >
          <FiChevronLeft /> Volver
        </Link>
        <button
          type="button"
          className="p-2 rounded-lg border border-gray-200 text-warm-gray"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label={sidebarOpen ? "Cerrar menú" : "Abrir contenido"}
        >
          {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed z-40 left-0 top-14 bottom-0 w-[min(100%,320px)] bg-white border-r border-gray-100 flex flex-col overflow-hidden
          transition-transform duration-200
          lg:translate-x-0 lg:static lg:top-auto lg:bottom-auto lg:w-80 lg:shrink-0 lg:max-h-[calc(100vh-5rem)]
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="p-4 border-b border-gray-100 hidden lg:block">
          <Link
            href={`/curso/${course.slug}`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-2"
          >
            <FiChevronLeft size={16} /> Volver al curso
          </Link>
          <h1 className="font-display font-bold text-warm-gray leading-tight">
            {course.title}
          </h1>
          <div className="mt-3">
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">{progress}% completado</p>
          </div>
          {lastLessonId && (
            <button
              type="button"
              onClick={continueLast}
              className="mt-2 text-xs font-semibold text-primary hover:underline"
            >
              Continuar donde lo dejaste
            </button>
          )}
        </div>

        <div className="p-4 border-b border-gray-100 lg:hidden">
          <h1 className="font-display font-semibold text-warm-gray text-sm line-clamp-2">
            {course.title}
          </h1>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4 pb-24 lg:pb-8">
          {course.modules.map((mod, mi) => (
            <div key={mod.id}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2 px-1">
                Módulo {mi + 1}: {mod.title}
              </p>
              <ul className="space-y-0.5">
                {mod.lessons.map((les, li) => {
                  const isActive = les.id === activeLesson?.id;
                  const isDone = completed.has(les.id);
                  return (
                    <li key={les.id}>
                      <button
                        type="button"
                        onClick={() => selectLesson(les.id)}
                        className={`
                          w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-start gap-2 transition-colors
                          ${isActive ? "bg-primary-light/50 text-primary-dark font-medium" : "hover:bg-gray-50 text-gray-600"}
                        `}
                      >
                        <span
                          className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                            isDone
                              ? "bg-green-500 border-green-500 text-white"
                              : "border-gray-200 text-gray-400"
                          }`}
                        >
                          {isDone ? <FiCheck size={12} /> : li + 1}
                        </span>
                        <span className="line-clamp-2">{les.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          aria-label="Cerrar"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
          {activeLesson ? (
            <>
              <div className="mb-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  {activeLesson.moduleTitle}
                </p>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-warm-gray">
                  {activeLesson.title}
                </h2>
              </div>

              <LessonVideoPlayer
                key={activeLesson.id}
                videoUrl={activeLesson.videoUrl}
              />

              {activeLesson.content && (
                <div className="mt-6 text-sm text-gray-600 bg-white rounded-2xl p-5 border border-gray-100 leading-relaxed">
                  <div className="whitespace-pre-wrap">{activeLesson.content}</div>
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3 items-center">
                <Button
                  type="button"
                  onClick={() => void markComplete()}
                  disabled={saving || completed.has(activeLesson.id)}
                >
                  {completed.has(activeLesson.id)
                    ? "Clase completada"
                    : "Marcar como completada"}
                </Button>
                {flat[activeIndex + 1] && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => selectLesson(flat[activeIndex + 1].id)}
                  >
                    Siguiente clase
                  </Button>
                )}
                {(certificateEligible || progress >= 100) && (
                  <CourseCertificateButton courseId={courseDbId} />
                )}
                <Link href="/mi-aprendizaje">
                  <Button type="button" variant="ghost">
                    Mi aprendizaje
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <p className="text-gray-400">No hay clases en este curso.</p>
          )}

          {course.resources.length > 0 && (
            <section className="mt-12 pt-8 border-t border-gray-200">
              <h3 className="font-display font-semibold text-warm-gray mb-4">
                Recursos descargables
              </h3>
              <ul className="space-y-2">
                {course.resources.map((r) => {
                  const href = resolveMediaPath(r.fileUrl);
                  return (
                    <li key={r.id}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                      >
                        <FiDownload size={16} />
                        {r.title}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
