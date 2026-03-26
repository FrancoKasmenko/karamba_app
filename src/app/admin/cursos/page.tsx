"use client";
import { api } from "@/lib/public-api";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { isLocalUploadPath } from "@/lib/image-url";
import { FiPlus, FiEdit, FiTrash2, FiCalendar, FiUsers, FiEye, FiEyeOff } from "react-icons/fi";
import { formatPrice } from "@/lib/utils";

interface CourseSession {
  id: string;
  date: string;
  capacity: number;
  _count: { bookings: number };
}

interface Course {
  id: string;
  title: string;
  slug: string;
  price: number;
  image: string | null;
  published: boolean;
  duration: string | null;
  sessions: CourseSession[];
  createdAt: string;
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = () => {
    fetch(api("/api/admin/courses"))
      .then((r) => r.json())
      .then(setCourses)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este curso y todas sus sesiones?")) return;
    await fetch(api(`/api/admin/courses/${id}`), { method: "DELETE" });
    fetchCourses();
  };

  const togglePublish = async (id: string, published: boolean) => {
    await fetch(api(`/api/admin/courses/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !published }),
    });
    fetchCourses();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-extrabold text-warm-gray">Cursos y Talleres</h1>
        <Link
          href="/admin/cursos/nuevo"
          className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-all"
        >
          <FiPlus size={16} />
          Nuevo Curso
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-primary-light/20">
          <FiCalendar size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No hay cursos creados todavía</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => {
            const totalBookings = course.sessions.reduce(
              (sum, s) => sum + s._count.bookings,
              0
            );
            const totalCapacity = course.sessions.reduce(
              (sum, s) => sum + s.capacity,
              0
            );

            return (
              <div
                key={course.id}
                className="bg-white rounded-xl border border-primary-light/20 p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-lavender/30 to-primary-light/20 overflow-hidden shrink-0">
                  {course.image ? (
                    <Image
                      src={course.image}
                      alt={course.title}
                      width={64}
                      height={64}
                      unoptimized={isLocalUploadPath(course.image)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FiCalendar className="text-primary-light" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-warm-gray truncate">
                      {course.title}
                    </h3>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        course.published
                          ? "bg-green-50 text-green-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {course.published ? "Publicado" : "Borrador"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{formatPrice(course.price)}</span>
                    {course.duration && <span>{course.duration}</span>}
                    <span className="flex items-center gap-1">
                      <FiCalendar size={11} />
                      {course.sessions.length} sesión{course.sessions.length !== 1 ? "es" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiUsers size={11} />
                      {totalBookings}/{totalCapacity} inscriptos
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => togglePublish(course.id, course.published)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title={course.published ? "Despublicar" : "Publicar"}
                  >
                    {course.published ? (
                      <FiEye size={16} className="text-green-500" />
                    ) : (
                      <FiEyeOff size={16} className="text-gray-400" />
                    )}
                  </button>
                  <Link
                    href={`/admin/cursos/${course.id}`}
                    className="p-2 rounded-lg hover:bg-primary-light/20 transition-colors"
                    title="Editar"
                  >
                    <FiEdit size={16} className="text-primary" />
                  </Link>
                  <button
                    onClick={() => handleDelete(course.id)}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="Eliminar"
                  >
                    <FiTrash2 size={16} className="text-red-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
