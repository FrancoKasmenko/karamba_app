import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";
import { isAllowedDigitalPath } from "@/lib/digital-product-path";
import { resolveMediaPath } from "@/lib/image-url";
import { uploadPublicUrlToAbsolutePath } from "@/lib/upload-disk-path";
import { normalizeProductDigitalFiles } from "@/lib/product-digital-files";
import type { OrderStatus } from "@prisma/client";

const PAID: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "Falta productId" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      isDigital: true,
      fileUrl: true,
      fileName: true,
      digitalFiles: true,
    },
  });

  const files = product ? normalizeProductDigitalFiles(product) : [];
  if (!product?.isDigital || files.length === 0) {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }

  const rawIdx = url.searchParams.get("fileIndex") ?? "0";
  const parsedIdx = parseInt(rawIdx, 10);
  const fileIndex =
    Number.isFinite(parsedIdx) ? parsedIdx : 0;
  const idx = Math.max(0, Math.min(files.length - 1, fileIndex));
  const entry = files[idx];

  const fileUrl =
    resolveMediaPath(entry.fileUrl) || entry.fileUrl.trim();
  if (!isAllowedDigitalPath(fileUrl)) {
    return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
  }

  const purchased = await prisma.orderItem.findFirst({
    where: {
      productId: product.id,
      itemType: "PRODUCT",
      order: {
        userId: session.user.id,
        status: { in: PAID },
      },
    },
  });

  if (!purchased) {
    return NextResponse.json(
      { error: "No tenés acceso a esta descarga" },
      { status: 403 }
    );
  }

  const diskPath = uploadPublicUrlToAbsolutePath(fileUrl);
  if (!diskPath) {
    return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
  }
  try {
    const buf = await readFile(diskPath);
    const downloadName = entry.fileName || "descarga";
    const ext = path.extname(diskPath).toLowerCase();
    const type =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".zip"
          ? "application/zip"
          : "application/octet-stream";

    return new NextResponse(buf, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }
}
