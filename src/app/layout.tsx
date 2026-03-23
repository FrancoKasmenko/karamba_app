import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Karamba | Productos Artesanales con Amor",
    template: "%s | Karamba",
  },
  description:
    "Descubrí productos artesanales únicos, hechos con amor y dedicación. Karamba - creamos para vos desde el corazón.",
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
  openGraph: {
    title: "Karamba | Productos Artesanales con Amor",
    description:
      "Descubrí productos artesanales únicos, hechos con amor y dedicación.",
    url: "https://karamba.com.uy",
    siteName: "Karamba",
    locale: "es_UY",
    type: "website",
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
