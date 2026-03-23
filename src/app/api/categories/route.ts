import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  applyDefaultNavbarCategoryFlags,
  navbarCategorySelect,
} from "@/lib/navbar-category-defaults";

export async function GET() {
  try {
    let categories = await prisma.category.findMany({
      where: { parentId: null, showInNavbar: true },
      orderBy: { order: "asc" },
      select: navbarCategorySelect,
    });

    if (categories.length === 0) {
      await applyDefaultNavbarCategoryFlags(prisma);
      categories = await prisma.category.findMany({
        where: { parentId: null, showInNavbar: true },
        orderBy: { order: "asc" },
        select: navbarCategorySelect,
      });
    }

    if (categories.length === 0) {
      categories = await prisma.category.findMany({
        where: { parentId: null },
        orderBy: { order: "asc" },
        select: navbarCategorySelect,
      });
    }

    return NextResponse.json(categories);
  } catch {
    return NextResponse.json([]);
  }
}
