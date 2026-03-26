"use client";
import { api } from "@/lib/public-api";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/button";
import {
  FiArrowLeft,
  FiLoader,
  FiMail,
  FiSave,
  FiShield,
  FiUser,
} from "react-icons/fi";

interface UserDetail {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  _count: { orders: number };
}

export default function AdminUsuarioDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [user, setUser] = useState<UserDetail | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteTotp, setPromoteTotp] = useState("");
  const [promoteBusy, setPromoteBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(api(`/api/admin/users/${id}`))
      .then((r) => {
        if (r.status === 404) {
          setUser(null);
          return null;
        }
        return r.json();
      })
      .then((d: UserDetail | null) => {
        if (!d) return;
        setUser(d);
        setName(d.name || "");
        setEmail(d.email);
        setPhone(d.phone || "");
        setAddress(d.address || "");
        setCity(d.city || "");
        setRole(d.role === "ADMIN" ? "ADMIN" : "USER");
      })
      .catch(() => toast.error("Error al cargar el usuario"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword || newPasswordConfirm) {
      if (newPassword.length < 8) {
        toast.error("La contraseña nueva debe tener al menos 8 caracteres");
        return;
      }
      if (newPassword !== newPasswordConfirm) {
        toast.error("Las contraseñas nuevas no coinciden");
        return;
      }
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim() || null,
        email: email.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        role,
      };
      if (newPassword.trim()) {
        body.newPassword = newPassword.trim();
      }

      const res = await fetch(api(`/api/admin/users/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "No se pudo guardar");
        return;
      }
      setUser(data);
      setNewPassword("");
      setNewPasswordConfirm("");
      toast.success("Usuario actualizado");
    } catch {
      toast.error("Error de red");
    } finally {
      setSaving(false);
    }
  };

  const handleSendReset = async () => {
    setResetSending(true);
    try {
      const res = await fetch(api(`/api/admin/users/${id}/send-password-reset`),
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "No se pudo enviar el correo");
        return;
      }
      toast.success(data.message || "Correo enviado");
    } catch {
      toast.error("Error de red");
    } finally {
      setResetSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
        <FiLoader className="animate-spin" size={22} />
        Cargando…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <p className="text-gray-500">Usuario no encontrado.</p>
        <Link
          href="/admin/usuarios"
          className="text-primary font-semibold text-sm inline-flex items-center gap-1"
        >
          <FiArrowLeft size={14} /> Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Link
          href="/admin/usuarios"
          className="text-sm font-semibold text-primary hover:text-primary-dark inline-flex items-center gap-1 mb-3"
        >
          <FiArrowLeft size={14} /> Usuarios
        </Link>
        <h1 className="font-display text-2xl font-bold text-warm-gray flex items-center gap-2">
          <FiUser className="text-primary shrink-0" />
          Editar usuario
        </h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">{user.email}</p>
      </div>

      <form onSubmit={(e) => void handleSave(e)} className="space-y-8">
        <div className="bg-white rounded-2xl border border-primary-light/30 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-warm-gray text-sm uppercase tracking-wide">
            Datos generales
          </h2>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Nombre
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
              placeholder="Nombre visible"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Email (inicio de sesión)
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Teléfono
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Dirección
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Ciudad
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-primary-light/30 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-warm-gray text-sm uppercase tracking-wide flex items-center gap-2">
            <FiShield size={16} className="text-primary" />
            Rol
          </h2>
          {user.role === "USER" ? (
            <>
              <p className="text-sm text-warm-gray">
                Rol actual: <strong>Usuario</strong>
              </p>
              <p className="text-xs text-gray-500">
                Para otorgar permisos de administrador usá el botón (si tenés 2FA
                activo te pediremos el código de tu app Authenticator).
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="border border-primary/30"
                onClick={() => {
                  setPromoteTotp("");
                  setPromoteOpen(true);
                }}
              >
                Promover a administrador…
              </Button>
            </>
          ) : (
            <>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "USER" | "ADMIN")}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
              >
                <option value="ADMIN">Administrador</option>
                <option value="USER">Usuario (quitar admin)</option>
              </select>
              <p className="text-xs text-gray-500">
                No podés quitar el rol admin al único administrador del sitio.
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-primary-light/30 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-warm-gray text-sm uppercase tracking-wide">
            Contraseña
          </h2>
          <p className="text-xs text-gray-500">
            Podés definir una nueva contraseña aquí (se guarda al pulsar
            &quot;Guardar cambios&quot;) o enviar un correo para que la persona
            elija la suya con un enlace seguro.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Nueva contraseña (opcional)
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                placeholder="Mín. 8 caracteres"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Repetir contraseña
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                placeholder="Solo si definís arriba"
              />
            </div>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto"
              disabled={resetSending}
              onClick={() => void handleSendReset()}
            >
              <FiMail className="mr-2" size={16} />
              {resetSending
                ? "Enviando…"
                : "Enviar correo de restablecimiento de contraseña"}
            </Button>
            <p className="text-[11px] text-gray-400 mt-2">
              Se envía al email actual del usuario (válido 1 hora). Requiere
              correo transaccional configurado.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving} size="sm">
            <FiSave className="mr-1" size={16} />
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/usuarios")}
          >
            Cancelar
          </Button>
        </div>
      </form>

      {promoteOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl border border-primary-light/30 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-warm-gray">Promover a administrador</h3>
            <p className="text-xs text-gray-500">
              Si tu cuenta tiene 2FA activado, ingresá el código de 6 dígitos o un
              código de respaldo. Si no usás 2FA, dejá el campo vacío y confirmá.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={promoteTotp}
              onChange={(e) => setPromoteTotp(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono text-center tracking-widest"
              placeholder="Código 2FA (opcional)"
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={promoteBusy}
                onClick={() => setPromoteOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={promoteBusy}
                onClick={async () => {
                  setPromoteBusy(true);
                  try {
                    const res = await fetch(api("/api/admin/users/promote"), {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId: id,
                        totpCode: promoteTotp.trim(),
                      }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      toast.error(data.error || "No se pudo promover");
                      return;
                    }
                    toast.success("Usuario promovido a administrador");
                    setPromoteOpen(false);
                    setPromoteTotp("");
                    setRole("ADMIN");
                    setUser((prev) =>
                      prev ? { ...prev, role: "ADMIN" } : prev
                    );
                  } catch {
                    toast.error("Error de red");
                  } finally {
                    setPromoteBusy(false);
                  }
                }}
              >
                {promoteBusy ? "…" : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-soft-gray/80 border border-primary-light/20 p-4 text-sm text-gray-600">
        <p>
          <strong className="text-warm-gray">Pedidos:</strong>{" "}
          {user._count.orders}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Registro:{" "}
          {new Date(user.createdAt).toLocaleString("es-UY", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          {" · "}
          Última actualización:{" "}
          {new Date(user.updatedAt).toLocaleString("es-UY", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>
    </div>
  );
}
