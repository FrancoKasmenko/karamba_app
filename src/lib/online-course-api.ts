import { CourseOnlineLevel, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { slugify } from "@/lib/utils";

const LEVELS: CourseOnlineLevel[] = ["BASIC", "INTERMEDIATE", "ADVANCED"];

export function parseOnlineCourseLevel(raw: unknown): CourseOnlineLevel {
  const s = String(raw ?? "").toUpperCase();
  if (LEVELS.includes(s as CourseOnlineLevel)) {
    return s as CourseOnlineLevel;
  }
  return CourseOnlineLevel.BASIC;
}

/** Slug único y nunca vacío (Postgres rechaza conflictos y strings vacíos en @unique). */
export function resolveOnlineCourseSlug(
  rawSlug: unknown,
  title: string
): string {
  let s =
    typeof rawSlug === "string" && rawSlug.trim()
      ? rawSlug.trim().replace(/\s+/g, "-")
      : slugify(title);
  if (!s) s = `curso-${randomUUID().slice(0, 10)}`;
  return s;
}

export function parseTotalDurationMinutes(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function parseLessonDurationMinutes(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export type LessonVideoFormType = "EXTERNAL" | "UPLOAD";

export function parseLessonVideoType(raw: unknown): LessonVideoFormType {
  const s = String(raw ?? "").toUpperCase();
  if (s === "UPLOAD") return "UPLOAD";
  return "EXTERNAL";
}

/** Prefijo canónico guardado en BD para MP4 subido (vía /api/uploads/…). */
export const LESSON_UPLOAD_VIDEO_PREFIX = "/api/uploads/course-videos/";

/** Solo lectura/ saneo de filas antiguas; no usar para nuevas URLs. */
const LEGACY_LESSON_VIDEO_PREFIX = "/uploads/course-videos/";

export function isLessonUploadVideoUrl(url: string | null | undefined): boolean {
  const u = url?.trim();
  if (!u) return false;
  return (
    u.startsWith(LESSON_UPLOAD_VIDEO_PREFIX) ||
    u.startsWith("/_k/uploads/course-videos/") ||
    u.startsWith(LEGACY_LESSON_VIDEO_PREFIX)
  );
}

/** Unifica tipo enlace + archivo en un solo `videoUrl` para Prisma. */
export function lessonVideoUrlFromPayload(l: {
  videoType?: string | null;
  videoUrl?: string | null;
  videoFile?: string | null;
}): string | null {
  const videoType = parseLessonVideoType(l.videoType);
  if (videoType === "UPLOAD") {
    return sanitizeLessonVideoFile(l.videoFile);
  }
  const raw = (l.videoUrl ?? "")
    .trim()
    .replace(/&amp;/gi, "&")
    .trim();
  return raw || null;
}

/** Solo `/api/uploads/course-videos/`; acepta prefijo antiguo solo para normalizar al guardar. */
export function sanitizeLessonVideoFile(
  path: string | null | undefined
): string | null {
  const p = path?.trim();
  if (!p) return null;
  if (p.includes("..") || p.includes("\\")) return null;
  if (p.startsWith(LESSON_UPLOAD_VIDEO_PREFIX)) return p;
  const publicK = "/_k/uploads/course-videos/";
  if (p.startsWith(publicK)) {
    return `${LESSON_UPLOAD_VIDEO_PREFIX}${p.slice(publicK.length)}`;
  }
  if (p.startsWith(LEGACY_LESSON_VIDEO_PREFIX)) {
    return `${LESSON_UPLOAD_VIDEO_PREFIX}${p.slice(LEGACY_LESSON_VIDEO_PREFIX.length)}`;
  }
  return null;
}

export function prismaOnlineCourseHttpError(
  e: unknown
): { message: string; status: number } | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      const target = (e.meta?.target as string[] | undefined)?.join(", ");
      if (target?.includes("slug")) {
        return {
          message:
            "Ya existe un curso con ese slug. Cambiá el campo Slug o dejalo vacío para generar uno nuevo.",
          status: 409,
        };
      }
      return {
        message: "Ya existe un registro con esos datos únicos.",
        status: 409,
      };
    }
    if (e.code === "P2025") {
      return { message: "El curso no existe o fue eliminado.", status: 404 };
    }
    if (e.code === "P2021") {
      return {
        message:
          "Falta sincronizar la base de datos. En la terminal: npx prisma db push",
        status: 503,
      };
    }
  }
  return null;
}
