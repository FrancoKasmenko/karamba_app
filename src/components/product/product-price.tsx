import { formatPrice } from "@/lib/utils";
import {
  PAYMENT_CARD_SURCHARGE_RATE,
  priceWithCardFee,
} from "@/lib/product-pricing";

type Props = {
  /** Precio en admin (= transferencia). */
  transferPrice: number;
  /** Precio anterior en admin (misma base que transfer); se muestra tachado como × (1 + recargo). */
  comparePrice?: number | null;
  compact?: boolean;
};

export default function ProductPrice({
  transferPrice,
  comparePrice,
  compact,
}: Props) {
  const normalPrice = priceWithCardFee(transferPrice);
  const pct = Math.round(PAYMENT_CARD_SURCHARGE_RATE * 100);
  const strikeCompare =
    comparePrice != null &&
    comparePrice > transferPrice &&
    comparePrice > 0
      ? priceWithCardFee(comparePrice)
      : null;

  return (
    <div className={compact ? "space-y-0.5" : "space-y-1.5"}>
      {strikeCompare != null && (
        <p
          className={`text-gray-400 line-through ${compact ? "text-xs" : "text-base"}`}
        >
          {formatPrice(strikeCompare)}
        </p>
      )}
      <p
        className={`font-extrabold text-primary-dark ${compact ? "text-base" : "text-2xl"}`}
      >
        {formatPrice(normalPrice)}
      </p>
      <span
        className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/80 ${
          compact ? "text-[9px] px-2 py-0.5" : "text-[10px] px-2.5 py-1"
        }`}
      >
        {pct}% OFF pagando por transferencia
      </span>
      {!compact && (
        <p className="text-sm text-emerald-800/90 font-semibold">
          {formatPrice(transferPrice)} por transferencia
        </p>
      )}
      {compact && (
        <p className="text-[10px] text-emerald-800/80 font-medium">
          {formatPrice(transferPrice)} transf.
        </p>
      )}
    </div>
  );
}
