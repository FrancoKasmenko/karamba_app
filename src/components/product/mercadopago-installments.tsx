import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import {
  MERCADOPAGO_DISPLAY_INSTALLMENTS,
  priceWithCardFee,
} from "@/lib/product-pricing";

/** Logo MP (Wikimedia); fallback local en /public/brand si preferís archivo propio. */
const MP_LOGO =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Mercado_Pago.svg/1280px-Mercado_Pago.svg.png";

type Props = {
  baseTransferPrice: number;
};

export default function MercadoPagoInstallments({
  baseTransferPrice,
}: Props) {
  const totalWithFee = priceWithCardFee(baseTransferPrice);

  return (
    <div className="mt-6 rounded-2xl border border-primary-light/40 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative h-8 w-[7.5rem] shrink-0">
          <Image
            src={MP_LOGO}
            alt="Mercado Pago"
            fill
            className="object-contain object-left"
            sizes="120px"
          />
        </div>
        <p className="text-sm font-bold text-warm-gray">Mercado Pago</p>
      </div>
      <ul className="space-y-2">
        {MERCADOPAGO_DISPLAY_INSTALLMENTS.map((n) => {
          const per = totalWithFee / n;
          return (
            <li
              key={n}
              className="flex justify-between items-center text-sm border-b border-gray-100 last:border-0 pb-2 last:pb-0"
            >
              <span className="text-gray-600">
                {n} {n === 1 ? "pago" : "cuotas"} de
              </span>
              <span className="font-bold text-primary-dark tabular-nums">
                {formatPrice(per)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
