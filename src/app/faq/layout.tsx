import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
