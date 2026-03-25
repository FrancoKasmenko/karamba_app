/** Recargo para pagos con Mercado Pago / tarjeta (el precio en admin = transferencia). */
export const PAYMENT_CARD_SURCHARGE_RATE = 0.12;

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function priceWithCardFee(baseTransferPrice: number): number {
  return roundMoney(baseTransferPrice * (1 + PAYMENT_CARD_SURCHARGE_RATE));
}

export function unitPriceForPaymentMethod(
  baseTransferPrice: number,
  method: "MERCADOPAGO" | "BANK_TRANSFER"
): number {
  return method === "MERCADOPAGO"
    ? priceWithCardFee(baseTransferPrice)
    : roundMoney(baseTransferPrice);
}

/** Cuotas a mostrar en ficha de producto (orden fijo). */
export const MERCADOPAGO_DISPLAY_INSTALLMENTS = [12, 10, 6, 3, 1] as const;
