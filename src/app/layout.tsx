import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { getMetadataBase, getSiteOrigin, toAbsoluteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

const defaultTitle = "Karamba | Productos Artesanales con Amor";
const defaultDescription =
  "Descubrí productos artesanales únicos, hechos con amor y dedicación. Karamba - creamos para vos desde el corazón.";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: defaultTitle,
    template: "%s | Karamba",
  },
  description: defaultDescription,
  keywords: [
    "karamba",
    "artesanal",
    "productos",
    "tienda",
    "uruguay",
    "montevideo",
    "regalos",
    "decoracion",
  ],
  icons: {
    icon: [{ url: "/brand/icon.png", type: "image/png" }],
    apple: "/brand/icon.png",
  },
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: getSiteOrigin(),
    siteName: "Karamba",
    locale: "es_UY",
    type: "website",
    images: [{ url: toAbsoluteUrl("/brand/icon.png"), width: 512, height: 512, alt: "Karamba" }],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [toAbsoluteUrl("/brand/icon.png")],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={poppins.variable}>
      <body className="min-h-screen flex flex-col antialiased">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
