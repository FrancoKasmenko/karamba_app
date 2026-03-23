import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { prisma } from "@/lib/prisma";

export async function getMercadoPagoClient() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "main" },
  });

  if (!settings?.mercadoPagoAccessToken || !settings.mercadoPagoEnabled) {
    return null;
  }

  return new MercadoPagoConfig({
    accessToken: settings.mercadoPagoAccessToken,
  });
}

export { Preference, Payment };
