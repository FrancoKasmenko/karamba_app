import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getWebhookUrl, getBaseUrl, isPublicUrl } from "@/lib/base-url";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  return NextResponse.json({
    webhookUrl: getWebhookUrl(),
    baseUrl: getBaseUrl(),
    isPublic: isPublicUrl(),
  });
}
