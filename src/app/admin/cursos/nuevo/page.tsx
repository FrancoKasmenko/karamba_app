import CourseForm from "../course-form";

export default function NewCoursePage() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-warm-gray mb-6">
        Nuevo Curso
      </h1>
      <CourseForm />
    </div>
  );
}
