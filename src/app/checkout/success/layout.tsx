import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compra confirmada",
};

export default function CheckoutSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
