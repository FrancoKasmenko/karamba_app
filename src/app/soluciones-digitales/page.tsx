import type { Metadata } from "next";
import { getSiteOrigin, toAbsoluteUrl } from "@/lib/site-url";
import SolucionesDigitalesClient from "./soluciones-digitales-client";

const title = "Soluciones Digitales";
const description =
  "Desarrollo web, tiendas online, sistemas a medida y soporte técnico en Uruguay. Karamba te acompaña con soluciones digitales claras y soporte para tu PC.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title: `${title} | Karamba`,
    description,
    url: `${getSiteOrigin()}/soluciones-digitales`,
    siteName: "Karamba",
    locale: "es_UY",
    type: "website",
    images: [{ url: toAbsoluteUrl("/brand/icon.png"), width: 512, height: 512, alt: "Karamba" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | Karamba`,
    description,
    images: [toAbsoluteUrl("/brand/icon.png")],
  },
};

export default function SolucionesDigitalesPage() {
  return <SolucionesDigitalesClient />;
}
