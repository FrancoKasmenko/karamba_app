"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import CourseForm from "../course-form";
import {
  FiPlus,
  FiTrash2,
  FiUsers,
  FiLoader,
  FiCheck,
  FiX as FiClose,
  FiChevronDown,
  FiChevronUp,
  FiVideo,
  FiLink,
} from "react-icons/fi";

interface Booking {
  id: string;
  status: string;
  paymentId: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string; phone: string | null };
}

interface Session {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  instructorName: string | null;
  capacity: number;
  meetingUrl: string | null;
  bookings: Booking[];
  _count: { bookings: number };
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image: string | null;
  duration: string | null;
  courseType: string;
  published: boolean;
  sessions: Session[];
}

const statusLabels: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendiente", cls: "bg-yellow-50 text-yellow-600" },
  PAID: { label: "Pagado", cls: "bg-green-50 text-green-600" },
  CANCELLED: { label: "Cancelado", cls: "bg-red-50 text-red-500" },
};

export default function EditCoursePage() {
  const params = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [newSession, setNewSession] = useState({
    date: "",
    startTime: "",
    endTime: "",
    instructorName: "",
    capacity: 10,
    meetingUrl: "",
  });
  const [addingSession, setAddingSession] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [manualEmailBySession, setManualEmailBySession] = useState<
    Record<string, string>
  >({});
  const [manualBookingBusy, setManualBookingBusy] = useState<string | null>(
    null
  );

  const fetchCourse = () => {
    fetch(`/api/admin/courses/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        setCourse(d);
        if (!expandedSession && d.sessions?.length) {
          setExpandedSession(d.sessions[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCourse(); }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSession.date || !newSession.startTime || !newSession.endTime) return;
    setAddingSession(true);

    await fetch(`/api/admin/courses/${params.id}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSession),
    });

    setNewSession({ date: "", startTime: "", endTime: "", instructorName: "", capacity: 10, meetingUrl: "" });
    setShowSessionForm(false);
    setAddingSession(false);
    fetchCourse();
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("¿Eliminar esta sesión y todas sus reservas?")) return;
    await fetch(`/api/admin/sessions/${sessionId}`, { method: "DELETE" });
    fetchCourse();
  };

  const handleBookingStatus = async (bookingId: string, status: string) => {
    await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchCourse();
  };

  const handleManualBooking = async (sessionId: string) => {
    const email = manualEmailBySession[sessionId]?.trim().toLowerCase();
    if (!email) {
      toast.error("Ingresá el email de la cuenta de la alumna");
      return;
    }
    setManualBookingBusy(sessionId);
    try {
      const res = await fetch(
        `/api/admin/course-sessions/${sessionId}/manual-booking`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "No se pudo agendar");
        return;
      }
      if (data.already) {
        toast.success("Esa alumna ya estaba inscripta como pagada");
      } else {
        toast.success("Alumna agendada en la sesión");
      }
      setManualEmailBySession((prev) => ({ ...prev, [sessionId]: "" }));
      fetchCourse();
    } catch {
      toast.error("Error de red");
    } finally {
      setManualBookingBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <FiLoader className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  if (!course) {
    return <p className="text-gray-500">Curso no encontrado</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-warm-gray mb-6">
          Editar: {course.title}
        </h1>
        <CourseForm
          initialData={{
            id: course.id,
            title: course.title,
            description: course.description || "",
            price: course.price,
            image: course.image || "",
            duration: course.duration || "",
            courseType: course.courseType || "PRESENCIAL",
            published: course.published,
          }}
        />
      </div>

      <hr className="border-primary-light/30" />

      {/* Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-warm-gray">
            Sesiones ({course.sessions.length})
          </h2>
          <button
            onClick={() => setShowSessionForm(!showSessionForm)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
          >
            <FiPlus size={14} />
            Agregar sesión
          </button>
        </div>

        {showSessionForm && (
          <form
            onSubmit={handleAddSession}
            className="bg-soft-gray rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha *</label>
              <input
                type="date"
                value={newSession.date}
                onChange={(e) => setNewSession((s) => ({ ...s, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Hora inicio *</label>
              <input
                type="time"
                value={newSession.startTime}
                onChange={(e) => setNewSession((s) => ({ ...s, startTime: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Hora fin *</label>
              <input
                type="time"
                value={newSession.endTime}
                onChange={(e) => setNewSession((s) => ({ ...s, endTime: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Instructor</label>
              <input
                type="text"
                value={newSession.instructorName}
                onChange={(e) => setNewSession((s) => ({ ...s, instructorName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary outline-none"
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cupos</label>
              <input
                type="number"
                value={newSession.capacity}
                onChange={(e) => setNewSession((s) => ({ ...s, capacity: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary outline-none"
                min={1}
              />
            </div>
            {course.courseType === "VIRTUAL" && (
              <div className="sm:col-span-2 lg:col-span-5">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  <FiVideo className="inline mr-1" size={12} />
                  Link de reunión (Zoom, Meet, etc.)
                </label>
                <input
                  type="url"
                  value={newSession.meetingUrl}
                  onChange={(e) => setNewSession((s) => ({ ...s, meetingUrl: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary outline-none"
                  placeholder="https://zoom.us/j/..."
                />
              </div>
            )}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={addingSession}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-all shrink-0"
              >
                {addingSession ? <FiLoader className="animate-spin" size={14} /> : "Agregar"}
              </button>
            </div>
          </form>
        )}

        {course.sessions.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-sm text-gray-400">No hay sesiones creadas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {course.sessions.map((s) => {
              const activeBookings = s.bookings.filter((b) => b.status !== "CANCELLED");
              const isExpanded = expandedSession === s.id;

              return (
                <div
                  key={s.id}
                  className="bg-white rounded-xl border border-primary-light/20 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedSession(isExpanded ? null : s.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-soft-gray/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div>
                        <p className="font-semibold text-warm-gray text-sm">
                          {new Date(s.date).toLocaleDateString("es-UY", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-gray-400">
                          {s.startTime} - {s.endTime}
                          {s.instructorName && ` · ${s.instructorName}`}
                          {s.meetingUrl && (
                            <a
                              href={s.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 ml-2 text-blue-500 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FiLink size={10} />
                              Link reunión
                            </a>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                        <FiUsers size={12} />
                        {activeBookings.length}/{s.capacity}
                      </span>
                      {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-primary-light/20 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-600">
                          Inscriptos ({activeBookings.length})
                        </h4>
                        <button
                          onClick={() => handleDeleteSession(s.id)}
                          className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                        >
                          <FiTrash2 size={12} />
                          Eliminar sesión
                        </button>
                      </div>

                      <div className="mb-4 p-3 rounded-xl bg-primary-light/15 border border-primary-light/30">
                        <p className="text-xs font-semibold text-gray-600 mb-2">
                          Agendar manualmente (la alumna debe tener cuenta en el sitio)
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="email"
                            placeholder="email@ejemplo.com"
                            value={manualEmailBySession[s.id] || ""}
                            onChange={(e) =>
                              setManualEmailBySession((prev) => ({
                                ...prev,
                                [s.id]: e.target.value,
                              }))
                            }
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary bg-white"
                            disabled={manualBookingBusy === s.id}
                          />
                          <button
                            type="button"
                            disabled={manualBookingBusy === s.id}
                            onClick={() => void handleManualBooking(s.id)}
                            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 transition-colors shrink-0"
                          >
                            {manualBookingBusy === s.id ? "…" : "Agendar"}
                          </button>
                        </div>
                      </div>

                      {s.bookings.length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">Sin inscripciones</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-gray-400 border-b border-gray-100">
                                <th className="text-left py-2 font-medium">Alumno</th>
                                <th className="text-left py-2 font-medium">Email</th>
                                <th className="text-left py-2 font-medium">Teléfono</th>
                                <th className="text-left py-2 font-medium">Estado</th>
                                <th className="text-right py-2 font-medium">Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s.bookings.map((b) => {
                                const st = statusLabels[b.status] || statusLabels.PENDING;
                                return (
                                  <tr key={b.id} className="border-b border-gray-50 last:border-0">
                                    <td className="py-2 text-warm-gray font-medium">
                                      {b.user.name || "—"}
                                    </td>
                                    <td className="py-2 text-gray-500">{b.user.email}</td>
                                    <td className="py-2 text-gray-500">{b.user.phone || "—"}</td>
                                    <td className="py-2">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>
                                        {st.label}
                                      </span>
                                    </td>
                                    <td className="py-2 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        {b.status !== "PAID" && (
                                          <button
                                            onClick={() => handleBookingStatus(b.id, "PAID")}
                                            className="p-1 hover:bg-green-50 rounded transition-colors"
                                            title="Marcar como pagado"
                                          >
                                            <FiCheck size={14} className="text-green-500" />
                                          </button>
                                        )}
                                        {b.status !== "CANCELLED" && (
                                          <button
                                            onClick={() => handleBookingStatus(b.id, "CANCELLED")}
                                            className="p-1 hover:bg-red-50 rounded transition-colors"
                                            title="Cancelar"
                                          >
                                            <FiClose size={14} className="text-red-400" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
