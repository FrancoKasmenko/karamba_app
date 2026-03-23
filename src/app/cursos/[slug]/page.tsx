import { Metadata } from "next";
import CourseDetail from "./course-detail";

export const metadata: Metadata = {
  title: "Detalle del Curso",
};

export default function CourseDetailPage() {
  return <CourseDetail />;
}
