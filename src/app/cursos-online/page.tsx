import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { resolveMediaPath } from "@/lib/image-url";
import { formatPrice } from "@/lib/utils";
import { levelLabel } from "@/lib/online-course-labels";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cursos online",
  description: "Cursos grabados: aprendé a tu ritmo con Karamba.",
  openGraph: {
    title: "Cursos online | Karamba",
    description: "Cursos grabados: aprendé a tu ritmo con Karamba.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cursos online | Karamba",
    description: "Cursos grabados: aprendé a tu ritmo con Karamba.",
  },
};

export default async function CursosOnlinePage() {
  const courses = await prisma.onlineCourse.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    include: {
      products: {
        where: { active: true, isOnlineCourse: true },
        take: 1,
        select: { price: true, slug: true },
      },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <header className="mb-10 text-center sm:text-left">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-warm-gray mb-2">
          Cursos online
        </h1>
        <p className="text-gray-500 max-w-xl">
          Elegí un curso, compralo como cualquier producto y accedé al contenido
          desde &quot;Mi aprendizaje&quot;.
        </p>
      </header>

      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((c) => {
          const img = c.image ? resolveMediaPath(c.image) : "";
          const displayPrice =
            c.products[0]?.price ?? c.price;
          return (
            <li key={c.id}>
              <Link
                href={`/curso/${c.slug}`}
                className="group block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all overflow-hidden h-full"
              >
                <div className="relative aspect-[16/10] bg-soft-gray">
                  {img ? (
                    <Image
                      src={img}
                      alt=""
                      fill
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">
                      Sin imagen
                    </div>
                  )}
                  <span className="absolute top-3 left-3 text-[11px] font-semibold uppercase tracking-wide bg-white/90 text-primary-dark px-2 py-1 rounded-lg">
                    {levelLabel(c.level)}
                  </span>
                </div>
                <div className="p-4 sm:p-5">
                  <h2 className="font-display font-semibold text-lg text-warm-gray group-hover:text-primary-dark transition-colors line-clamp-2">
                    {c.title}
                  </h2>
                  <p className="mt-2 text-primary-dark font-bold">
                    {formatPrice(displayPrice)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {courses.length === 0 && (
        <p className="text-center text-gray-400 py-16">
          Pronto habrá cursos disponibles.
        </p>
      )}
    </div>
  );
}
