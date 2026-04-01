import Link from "next/link";
import Image from "next/image";
import { resolveMediaPath, isLocalUploadPath } from "@/lib/image-url";
import { formatPrice } from "@/lib/utils";
import { levelLabel } from "@/lib/online-course-labels";
import Button from "@/components/ui/button";
import { CourseBuyActions } from "@/components/learning/course-buy-button";
import { DescriptionText } from "@/components/ui/description-text";

type CourseIn = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  image: string | null;
  price: number;
  level: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  /** Duración total manual o null para sumar por clases */
  totalDurationMinutes: number | null;
  modules: {
    id: string;
    title: string;
    lessons: { id: string; title: string; durationMinutes: number | null }[];
  }[];
  resources: { id: string; title: string }[];
  products: {
    id: string;
    slug: string;
    name: string;
    price: number;
    imageUrl: string | null;
    images: string[];
  }[];
};

function computedDurationMin(course: CourseIn): number | null {
  if (course.totalDurationMinutes != null && course.totalDurationMinutes > 0) {
    return course.totalDurationMinutes;
  }
  let sum = 0;
  for (const m of course.modules) {
    for (const l of m.lessons) {
      if (l.durationMinutes && l.durationMinutes > 0) sum += l.durationMinutes;
    }
  }
  return sum > 0 ? sum : null;
}

export default function OnlineCoursePublic({
  course,
  hasAccess,
}: {
  course: CourseIn;
  hasAccess: boolean;
}) {
  const img = course.image ? resolveMediaPath(course.image) : "";
  const product = course.products[0];
  const salePrice = product?.price ?? course.price;
  const duration = computedDurationMin(course);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="grid lg:grid-cols-5 gap-8 lg:gap-10">
        <div className="lg:col-span-2">
          <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-soft-gray shadow-md">
            {img ? (
              <Image
                src={img}
                alt=""
                fill
                unoptimized={isLocalUploadPath(img)}
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                Sin imagen
              </div>
            )}
          </div>
        </div>
        <div className="lg:col-span-3 space-y-5">
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-primary-dark/80">
            <span className="bg-primary-light/40 px-2 py-1 rounded-lg">
              {levelLabel(course.level)}
            </span>
            {duration != null && duration > 0 && (
              <span className="bg-soft-gray px-2 py-1 rounded-lg text-warm-gray">
                ~{duration} min
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-warm-gray">
            {course.title}
          </h1>
          <p className="text-2xl font-bold text-primary-dark">
            {formatPrice(salePrice)}
          </p>
          <DescriptionText
            className="text-sm text-gray-600 leading-relaxed"
            as="div"
          >
            {course.description}
          </DescriptionText>

          <div className="flex flex-wrap gap-3 pt-2">
            {hasAccess ? (
              <Link href={`/curso/${course.slug}/contenido`}>
                <Button size="lg">Ir al aula</Button>
              </Link>
            ) : product ? (
              <CourseBuyActions product={product} />
            ) : (
              <p className="text-sm text-amber-700 bg-amber-50 px-4 py-2 rounded-xl">
                No se pudo cargar la venta de este curso. Recargá o contactanos.
              </p>
            )}
            <Link href="/cursos-online">
              <Button variant="outline" size="lg">
                Ver más cursos
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <section className="mt-14 border-t border-gray-100 pt-10">
        <h2 className="font-display text-xl font-semibold text-warm-gray mb-6">
          Contenido del curso (vista previa)
        </h2>
        <ol className="space-y-6">
          {course.modules.map((mod, i) => (
            <li
              key={mod.id}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                Módulo {i + 1}
              </p>
              <h3 className="font-semibold text-warm-gray mb-3">{mod.title}</h3>
              <ul className="space-y-2">
                {mod.lessons.map((les, j) => (
                  <li
                    key={les.id}
                    className="flex gap-2 text-sm text-gray-600 pl-2 border-l-2 border-primary/25"
                  >
                    <span className="text-gray-400 w-6 shrink-0">{j + 1}.</span>
                    <span>{les.title}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        {course.modules.length === 0 && (
          <p className="text-gray-400 text-sm">Contenido en preparación.</p>
        )}
      </section>

      {course.resources.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold text-warm-gray mb-3">
            Recursos incluidos
          </h2>
          <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
            {course.resources.map((r) => (
              <li key={r.id}>{r.title}</li>
            ))}
          </ul>
          {!hasAccess && (
            <p className="text-xs text-gray-400 mt-2">
              Los archivos se desbloquean al comprar el curso.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
