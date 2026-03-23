import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}
