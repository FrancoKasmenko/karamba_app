import { prisma } from "@/lib/prisma";
import HeroSlider from "@/components/home/hero-slider";
import StorySection from "@/components/home/story-section";
import FeaturedProducts from "@/components/home/featured-products";
import BestSellers from "@/components/home/best-sellers";
import YouTubeSection from "@/components/home/youtube-section";
import InstagramSection from "@/components/home/instagram-section";
import BrandSection from "@/components/home/brand-section";

export default async function HomePage() {
  let products: {
    id: string;
    name: string;
    slug: string;
    price: number;
    comparePrice: number | null;
    images: string[];
    imageUrl: string | null;
    isDigital: boolean;
  }[] = [];

  let banners: {
    id: string;
    title: string | null;
    subtitle: string | null;
    buttonText: string | null;
    buttonLink: string | null;
    image: string;
  }[] = [];

  try {
    [products, banners] = await Promise.all([
      prisma.product.findMany({
        where: { active: true, featured: true, isOnlineCourse: false },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          comparePrice: true,
          images: true,
          imageUrl: true,
          isDigital: true,
        },
      }),
      prisma.banner.findMany({
        where: { active: true },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          subtitle: true,
          buttonText: true,
          buttonLink: true,
          image: true,
        },
      }),
    ]);
  } catch {
    // DB not connected yet
  }

  return (
    <>
      <HeroSlider banners={banners.length > 0 ? banners : undefined} />
      <StorySection />
      {products.length > 0 && <FeaturedProducts products={products} />}
      <BestSellers />
      <YouTubeSection />
      <InstagramSection />
      <BrandSection />

      {/* CTA Section */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden bg-gradient-to-br from-secondary-light/40 via-lavender/30 to-mint/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-light/25 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-light/20 rounded-full translate-y-1/3 -translate-x-1/3 blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-warm-gray">
                &iquest;Quer&eacute;s algo especial?
              </h2>
              <p className="mt-4 text-gray-600 max-w-lg mx-auto">
                Hacemos pedidos personalizados. Contanos qu&eacute; ten&eacute;s
                en mente y lo creamos para vos.
              </p>
              <a
                href="/contacto"
                className="inline-flex mt-6 text-white px-8 py-3.5 rounded-full font-semibold transition-all shadow-lg hover:shadow-xl text-sm bg-gradient-to-r from-secondary to-primary hover:shadow-secondary/20"
              >
                Contactanos
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
