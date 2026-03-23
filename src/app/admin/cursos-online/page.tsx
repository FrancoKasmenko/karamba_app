import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Button from "@/components/ui/button";
import { FiPlus, FiEdit2 } from "react-icons/fi";
import { levelLabel } from "@/lib/online-course-labels";

export default async function AdminCursosOnlinePage() {
  const courses = await prisma.onlineCourse.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { modules: true, enrollments: true } },
      products: { select: { id: true, slug: true, name: true } },
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="font-display text-2xl font-bold text-gray-800">
          Cursos online
        </h1>
        <Link href="/admin/cursos-online/nuevo">
          <Button size="sm">
            <FiPlus className="mr-1.5" /> Nuevo curso
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-primary-light/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft-gray/80 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Nivel</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Venta (auto)</th>
                <th className="px-4 py-3 font-medium w-24" />
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-gray-100 hover:bg-primary-light/5"
                >
                  <td className="px-4 py-3 font-medium text-warm-gray">
                    {c.title}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {c.slug}
                  </td>
                  <td className="px-4 py-3">{levelLabel(c.level)}</td>
                  <td className="px-4 py-3">
                    {c.isPublished ? (
                      <span className="text-green-600 font-medium">Publicado</span>
                    ) : (
                      <span className="text-gray-400">Borrador</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 font-mono">
                    {c.products[0] ? (
                      <span title="Carrito / checkout; no aparece en Productos">
                        {c.products[0].slug}
                      </span>
                    ) : (
                      <span className="text-amber-600">
                        Pendiente — editá y guardá el curso
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/cursos-online/${c.id}`}
                      className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
                    >
                      <FiEdit2 size={14} /> Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {courses.length === 0 && (
          <p className="p-8 text-center text-gray-400 text-sm">
            No hay cursos. Creá uno: el producto de venta se genera solo.
          </p>
        )}
      </div>
    </div>
  );
}
