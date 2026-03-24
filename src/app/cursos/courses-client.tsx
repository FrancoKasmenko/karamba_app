"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { isLocalUploadPath } from "@/lib/image-url";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiCalendar, FiClock, FiUsers } from "react-icons/fi";
import { formatPrice } from "@/lib/utils";

interface CourseSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  instructorName: string | null;
  capacity: number;
  _count: { bookings: number };
}

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  image: string | null;
  duration: string | null;
  sessions: CourseSession[];
}

export default function CoursesClient() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then(setCourses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-lavender/20 via-transparent to-primary-light/10 pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <span className="text-secondary-dark font-semibold text-sm uppercase tracking-wider">
              Aprendé con nosotros
            </span>
            <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-warm-gray">
              Cursos y Talleres
            </h1>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
              Explorá nuestros talleres creativos, reservá tu lugar y viví una
              experiencia única aprendiendo nuevas técnicas.
            </p>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl h-96 animate-pulse border border-primary-light/20" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <FiCalendar size={48} className="mx-auto text-primary-light mb-4" />
              <h3 className="text-xl font-bold text-warm-gray mb-2">
                Próximamente
              </h3>
              <p className="text-gray-500">
                Estamos preparando nuevos cursos y talleres. ¡Seguinos en redes
                para enterarte!
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course, idx) => {
                const nextSession = course.sessions[0];
                const spotsLeft = nextSession
                  ? nextSession.capacity - nextSession._count.bookings
                  : 0;

                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Link
                      href={`/cursos/${course.slug}`}
                      className="group block bg-white rounded-2xl overflow-hidden border border-primary-light/20 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1"
                    >
                      <div className="aspect-[16/10] relative bg-gradient-to-br from-lavender/30 to-primary-light/20 overflow-hidden">
                        {course.image ? (
                          <Image
                            src={course.image}
                            alt={course.title}
                            fill
                            unoptimized={isLocalUploadPath(course.image)}
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <FiCalendar size={40} className="text-primary-light" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-primary-dark font-bold text-sm px-3 py-1 rounded-full shadow-sm">
                          {formatPrice(course.price)}
                        </div>
                      </div>

                      <div className="p-5">
                        <h3 className="text-lg font-bold text-warm-gray group-hover:text-primary transition-colors line-clamp-2">
                          {course.title}
                        </h3>

                        {course.description && (
                          <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                            {course.description}
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                          {course.duration && (
                            <span className="flex items-center gap-1">
                              <FiClock size={12} />
                              {course.duration}
                            </span>
                          )}
                          {nextSession && (
                            <>
                              <span className="flex items-center gap-1">
                                <FiCalendar size={12} />
                                {new Date(nextSession.date).toLocaleDateString("es-UY", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </span>
                              <span className="flex items-center gap-1">
                                <FiUsers size={12} />
                                <span className={spotsLeft <= 3 ? "text-red-500 font-semibold" : ""}>
                                  {spotsLeft > 0
                                    ? `${spotsLeft} lugar${spotsLeft !== 1 ? "es" : ""}`
                                    : "Agotado"}
                                </span>
                              </span>
                            </>
                          )}
                        </div>

                        <div className="mt-4 text-sm font-semibold text-primary group-hover:text-primary-dark transition-colors">
                          Ver curso →
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
