import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveMediaPath, isLocalUploadPath } from "@/lib/image-url";
import { levelLabel } from "@/lib/online-course-labels";
import Button from "@/components/ui/button";
import CourseCertificateButton from "@/components/learning/course-certificate-button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mi aprendizaje | Karamba",
};

export default async function MiAprendizajePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/mi-aprendizaje");
  }

  const purchases = await prisma.userCoursePurchase.findMany({
    where: { userId: session.user.id },
    select: { onlineCourseId: true },
    distinct: ["onlineCourseId"],
  });
  const courseIds = purchases.map((p) => p.onlineCourseId);

  const enrollments = await prisma.userCourse.findMany({
    where: {
      userId: session.user.id,
      onlineCourseId: { in: courseIds },
    },
    include: {
      onlineCourse: {
        select: {
          id: true,
          title: true,
          slug: true,
          image: true,
          level: true,
          isPublished: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <h1 className="font-display text-3xl font-bold text-warm-gray mb-2">
        Mi aprendizaje
      </h1>
      <p className="text-gray-500 text-sm mb-10">
        Tus cursos online comprados. El progreso se guarda automáticamente.
      </p>

      <ul className="space-y-5">
        {enrollments
          .filter((e) => e.onlineCourse.isPublished)
          .map((e) => {
          const c = e.onlineCourse;
          const img = c.image ? resolveMediaPath(c.image) : "";
          return (
            <li
              key={e.id}
              className="flex flex-col sm:flex-row gap-4 p-4 sm:p-5 rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="relative w-full sm:w-36 aspect-video sm:aspect-square shrink-0 rounded-xl overflow-hidden bg-soft-gray">
                {img ? (
                  <Image
                    src={img}
                    alt=""
                    fill
                    unoptimized={isLocalUploadPath(img)}
                    className="object-cover"
                    sizes="144px"
                  />
                ) : null}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-primary">
                    {levelLabel(c.level)}
                  </span>
                  <h2 className="font-display font-semibold text-lg text-warm-gray">
                    {c.title}
                  </h2>
                </div>
                <div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden max-w-md">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, e.progress)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {Math.round(e.progress)}% completado
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Link href={`/curso/${c.slug}/contenido`}>
                    <Button size="sm">
                      {e.lastLessonId ? "Continuar" : "Empezar"}
                    </Button>
                  </Link>
                  <Link href={`/curso/${c.slug}`}>
                    <Button variant="outline" size="sm">
                      Detalle
                    </Button>
                  </Link>
                  {e.progress >= 100 && (
                    <CourseCertificateButton courseId={c.id} />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {enrollments.filter((e) => e.onlineCourse.isPublished).length === 0 && (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-gray-200 bg-soft-gray/30">
          <p className="text-gray-500 mb-4">
            Todavía no tenés cursos online. Explorá el catálogo y comprá como
            cualquier producto.
          </p>
          <Link href="/cursos-online">
            <Button>Ver cursos online</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
