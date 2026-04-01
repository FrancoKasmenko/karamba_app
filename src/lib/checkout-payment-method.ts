import type { CheckoutPaymentMethod } from "@prisma/client";

export function parseBodyPaymentMethod(
  raw: unknown
): CheckoutPaymentMethod | null {
  if (raw === "BANK_TRANSFER") return "BANK_TRANSFER";
  if (raw === "PAYPAL") return "PAYPAL";
  if (raw === "MERCADOPAGO") return "MERCADOPAGO";
  return null;
}
