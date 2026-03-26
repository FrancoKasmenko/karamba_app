import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import AdminSidebar from "./admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, twoFactorEnabled: true },
  });

  if (!dbUser || dbUser.role !== Role.ADMIN) {
    redirect("/");
  }

  if (!dbUser.twoFactorEnabled) {
    redirect("/perfil?admin2fa=1");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-cream/50">
      <AdminSidebar />
      <div className="flex-1 p-5 sm:p-8 lg:p-10 overflow-auto">{children}</div>
    </div>
  );
}
