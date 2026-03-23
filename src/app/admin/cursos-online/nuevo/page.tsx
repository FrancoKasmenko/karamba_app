import OnlineCourseForm from "../online-course-form";

const initial = {
  title: "",
  slug: "",
  description: "",
  image: "",
  price: "0",
  level: "BASIC" as const,
  isPublished: false,
  totalDurationMinutes: "",
  modules: [] as {
    title: string;
    order: number;
    lessons: {
      title: string;
      videoType: "EXTERNAL" | "UPLOAD";
      videoUrl: string;
      videoFile: string;
      content: string;
      order: number;
      durationMinutes: string;
    }[];
  }[],
  resources: [] as { title: string; fileUrl: string; order: number }[],
};

export default function NuevoCursoOnlinePage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-800 mb-6">
        Nuevo curso online
      </h1>
      <OnlineCourseForm initial={initial} />
    </div>
  );
}
