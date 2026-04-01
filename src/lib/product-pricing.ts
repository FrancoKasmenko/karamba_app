import type { CheckoutPaymentMethod } from "@prisma/client";

/** Recargo para pagos con Mercado Pago / PayPal / tarjeta (el precio en admin = transferencia). */
export const PAYMENT_CARD_SURCHARGE_RATE = 0.12;

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function priceWithCardFee(baseTransferPrice: number): number {
  return roundMoney(baseTransferPrice * (1 + PAYMENT_CARD_SURCHARGE_RATE));
}

export function unitPriceForPaymentMethod(
  baseTransferPrice: number,
  method: CheckoutPaymentMethod
): number {
  if (method === "BANK_TRANSFER") return roundMoney(baseTransferPrice);
  return priceWithCardFee(baseTransferPrice);
}

/** Cuotas a mostrar en ficha de producto (orden fijo). */
export const MERCADOPAGO_DISPLAY_INSTALLMENTS = [12, 10, 6, 3, 1] as const;
