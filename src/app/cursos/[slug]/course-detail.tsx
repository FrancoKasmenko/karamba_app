"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { isLocalUploadPath } from "@/lib/image-url";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  FiCalendar,
  FiClock,
  FiUsers,
  FiUser,
  FiArrowLeft,
  FiCheck,
  FiAlertCircle,
  FiLoader,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
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

export default function CourseDetail() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.slug) return;
    fetch(`/api/courses/${params.slug}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        setCourse(d);
        const available = d.sessions?.find(
          (s: CourseSession) => s._count.bookings < s.capacity
        );
        if (available) setSelectedSession(available.id);
      })
      .catch(() => setCourse(null))
      .finally(() => setLoading(false));
  }, [params.slug]);

  const handleBook = async () => {
    if (!session?.user) {
      router.push(`/login?redirect=/cursos/${params.slug}`);
      return;
    }
    if (!selectedSession) return;
    setBooking(true);
    setError("");

    try {
      const res = await fetch("/api/courses/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSession }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al reservar");

      if (data.initPoint) {
        window.location.href = data.initPoint;
      } else {
        const oid = data.orderId ? `&orderId=${data.orderId}` : "";
        router.push(`/cursos/reserva-exitosa?bookingId=${data.bookingId}${oid}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar la reserva");
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FiLoader className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold text-warm-gray">Curso no encontrado</h2>
        <Link href="/cursos" className="text-primary font-medium hover:underline">
          ← Volver a cursos
        </Link>
      </div>
    );
  }

  const selected = course.sessions.find((s) => s.id === selectedSession);
  const spotsLeft = selected ? selected.capacity - selected._count.bookings : 0;

  return (
    <div className="min-h-screen">
      <section className="relative py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/cursos"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors mb-6"
          >
            <FiArrowLeft size={14} />
            Volver a cursos
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Main content */}
            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="aspect-[16/9] relative rounded-2xl overflow-hidden bg-gradient-to-br from-lavender/30 to-primary-light/20 mb-6">
                  {course.image ? (
                    <Image
                      src={course.image}
                      alt={course.title}
                      fill
                      unoptimized={isLocalUploadPath(course.image)}
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FiCalendar size={60} className="text-primary-light/50" />
                    </div>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-warm-gray mb-4">
                  {course.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
                  {course.duration && (
                    <span className="flex items-center gap-1.5 bg-lavender/20 px-3 py-1 rounded-full">
                      <FiClock size={14} />
                      {course.duration}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 bg-primary-light/20 px-3 py-1 rounded-full font-semibold text-primary-dark">
                    {formatPrice(course.price)}
                  </span>
                </div>

                {course.description && (
                  <div className="prose prose-gray max-w-none">
                    {course.description.split("\n").map((p, i) => (
                      <p key={i} className="text-gray-600 leading-relaxed mb-3">
                        {p}
                      </p>
                    ))}
                  </div>
                )}

                <div className="mt-8 p-5 bg-mint/10 rounded-2xl border border-mint/30">
                  <div className="flex items-start gap-3">
                    <FaWhatsapp className="text-green-500 mt-0.5 shrink-0" size={20} />
                    <div>
                      <p className="text-sm font-semibold text-warm-gray">
                        ¿Tenés consultas?
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Escribinos al{" "}
                        <a
                          href="https://wa.me/59897629629"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 font-medium hover:underline"
                        >
                          097 629 629
                        </a>{" "}
                        y te ayudamos con todo lo que necesites.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Sidebar - booking */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="sticky top-24 bg-white rounded-2xl border border-primary-light/30 shadow-lg p-6"
              >
                <h2 className="text-lg font-bold text-warm-gray mb-1">
                  Reservá tu lugar
                </h2>
                <p className="text-2xl font-extrabold text-primary mb-5">
                  {formatPrice(course.price)}
                </p>

                {course.sessions.length === 0 ? (
                  <div className="text-center py-6">
                    <FiCalendar size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">
                      No hay fechas disponibles por ahora
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-500 mb-3">
                      Elegí una fecha:
                    </p>
                    <div className="space-y-2 mb-5 max-h-64 overflow-y-auto">
                      {course.sessions.map((s) => {
                        const spots = s.capacity - s._count.bookings;
                        const isFull = spots <= 0;
                        const isSelected = selectedSession === s.id;

                        return (
                          <button
                            key={s.id}
                            disabled={isFull}
                            onClick={() => !isFull && setSelectedSession(s.id)}
                            className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                              isSelected
                                ? "border-primary bg-primary-light/10"
                                : isFull
                                  ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                                  : "border-primary-light/30 hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-warm-gray">
                                  {new Date(s.date).toLocaleDateString("es-UY", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                  })}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {s.startTime} - {s.endTime}
                                  {s.instructorName && ` · ${s.instructorName}`}
                                </p>
                              </div>
                              <div className="text-right">
                                {isFull ? (
                                  <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                                    Agotado
                                  </span>
                                ) : (
                                  <span
                                    className={`text-xs font-medium ${
                                      spots <= 3
                                        ? "text-orange-500"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {spots} lugar{spots !== 1 ? "es" : ""}
                                  </span>
                                )}
                                {isSelected && !isFull && (
                                  <FiCheck className="text-primary ml-auto mt-1" size={16} />
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {selectedSession && spotsLeft > 0 && (
                      <div className="mb-4">
                        {spotsLeft <= 3 && (
                          <p className="text-xs text-orange-500 font-medium flex items-center gap-1 mb-2">
                            <FiAlertCircle size={12} />
                            ¡Quedan solo {spotsLeft} lugar{spotsLeft !== 1 ? "es" : ""}!
                          </p>
                        )}
                      </div>
                    )}

                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-sm text-red-500 bg-red-50 rounded-lg p-3 mb-3"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={handleBook}
                      disabled={!selectedSession || spotsLeft <= 0 || booking}
                      className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-3.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2"
                    >
                      {booking ? (
                        <>
                          <FiLoader className="animate-spin" size={16} />
                          Procesando...
                        </>
                      ) : !session?.user ? (
                        <>
                          <FiUser size={16} />
                          Ingresar para reservar
                        </>
                      ) : (
                        "Reservar y pagar"
                      )}
                    </button>

                    <p className="text-[11px] text-gray-400 text-center mt-3">
                      Serás redirigido a MercadoPago para completar el pago
                    </p>
                  </>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
