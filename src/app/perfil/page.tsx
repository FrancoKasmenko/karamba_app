import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProfileClient from "./profile-client";

type PageProps = {
  searchParams: Promise<{ admin2fa?: string }>;
};

export default async function PerfilPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const raw = sp.admin2fa;
  const admin2FARequired =
    raw === "1" ||
    raw === "true" ||
    raw === "" ||
    (typeof raw === "string" && raw.toLowerCase() === "yes");

  let user = null;
  let orders: unknown[] = [];
  let bookings: unknown[] = [];
  let onlineEnrollments: unknown[] = [];

  try {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        twoFactorEnabled: true,
      },
    });

    orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      include: {
        items: {
          select: {
            productName: true,
            quantity: true,
            price: true,
            variant: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    bookings = await prisma.courseBooking.findMany({
      where: { userId: session.user.id },
      include: {
        courseSession: {
          include: {
            course: {
              select: { title: true, slug: true, image: true, courseType: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const purchases = await prisma.userCoursePurchase.findMany({
      where: { userId: session.user.id },
      select: { onlineCourseId: true },
      distinct: ["onlineCourseId"],
    });
    const onlineCourseIds = purchases.map((p) => p.onlineCourseId);
    if (onlineCourseIds.length > 0) {
      onlineEnrollments = await prisma.userCourse.findMany({
        where: {
          userId: session.user.id,
          onlineCourseId: { in: onlineCourseIds },
        },
        include: {
          onlineCourse: {
            select: {
              title: true,
              slug: true,
              image: true,
              isPublished: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
    }
  } catch {
    // DB not connected
  }

  return (
    <ProfileClient
      user={user}
      orders={JSON.parse(JSON.stringify(orders))}
      bookings={JSON.parse(JSON.stringify(bookings))}
      onlineEnrollments={JSON.parse(JSON.stringify(onlineEnrollments))}
      admin2FARequired={admin2FARequired}
    />
  );
}
