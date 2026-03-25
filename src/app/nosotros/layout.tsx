import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nosotros",
};

export default function NosotrosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
