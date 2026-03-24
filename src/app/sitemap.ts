import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteOrigin } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteOrigin();
  const now = new Date();

  const staticPaths: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/productos", priority: 0.9 },
    { path: "/cursos", priority: 0.85 },
    { path: "/cursos-online", priority: 0.85 },
    { path: "/contacto", priority: 0.6 },
    { path: "/nosotros", priority: 0.6 },
    { path: "/faq", priority: 0.5 },
    { path: "/podcast", priority: 0.6 },
    { path: "/politicas-envio", priority: 0.3 },
    { path: "/politicas-cambio", priority: 0.3 },
  ];

  const entries: MetadataRoute.Sitemap = staticPaths.map(({ path, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority,
  }));

  try {
    const [products, courses, onlineCourses, categories] = await Promise.all([
      prisma.product.findMany({
        where: { active: true, isOnlineCourse: false },
        select: { slug: true, updatedAt: true },
      }),
      prisma.course.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.onlineCourse.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.category.findMany({
        select: { slug: true, updatedAt: true },
      }),
    ]);

    for (const p of products) {
      entries.push({
        url: `${base}/productos/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
    for (const c of courses) {
      entries.push({
        url: `${base}/cursos/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
    for (const c of onlineCourses) {
      entries.push({
        url: `${base}/curso/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
    for (const c of categories) {
      entries.push({
        url: `${base}/productos?categoria=${encodeURIComponent(c.slug)}`,
        lastModified: c.updatedAt,
        changeFrequency: "weekly",
        priority: 0.55,
      });
    }
  } catch {
    /* sin DB */
  }

  return entries;
}
