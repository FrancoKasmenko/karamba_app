import { Metadata } from "next";
import CoursesClient from "./courses-client";

export const metadata: Metadata = {
  title: "Cursos y Talleres",
  description: "Descubrí nuestros cursos y talleres creativos. Reservá tu lugar y aprendé con nosotros.",
};

export default function CoursesPage() {
  return <CoursesClient />;
}
