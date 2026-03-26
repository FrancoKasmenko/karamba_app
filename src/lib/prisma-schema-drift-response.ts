import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

/**
 * Tabla o columna ausente (deploy nuevo + BD vieja). P2021 tabla, P2022 columna.
 */
export function nextResponseForPrismaSchemaDrift(e: unknown): NextResponse | null {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return null;
  if (e.code === "P2021" || e.code === "P2022") {
    return NextResponse.json(
      {
        error:
          "La base de datos del servidor no está al día con el código desplegado. En el VPS, con la misma DATABASE_URL que usa la app, ejecutá: npx prisma db push",
      },
      { status: 503 }
    );
  }
  return null;
}
