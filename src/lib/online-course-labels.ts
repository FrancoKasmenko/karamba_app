import type { CourseOnlineLevel } from "@prisma/client";

export function levelLabel(level: CourseOnlineLevel): string {
  switch (level) {
    case "BASIC":
      return "Básico";
    case "INTERMEDIATE":
      return "Intermedio";
    case "ADVANCED":
      return "Avanzado";
    default:
      return level;
  }
}
