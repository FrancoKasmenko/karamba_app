"use client";
import { api } from "@/lib/public-api";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiEdit } from "react-icons/fi";

interface User {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  _count: { orders: number };
}

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(api("/api/admin/users"))
      .then((r) => r.json())
      .then((d) => {
        setUsers(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 py-10">Cargando...</div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-800 mb-2">
        Usuarios
      </h1>
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">
        Hacé clic en <strong>Editar</strong> para cambiar email, datos de contacto,
        rol, contraseña o enviar el correo de restablecimiento.
      </p>

      <div className="bg-white rounded-2xl border border-primary-light/30 overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="bg-beige text-left">
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                Nombre
              </th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                Teléfono
              </th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                Rol
              </th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                Pedidos
              </th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                Fecha
              </th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase w-28">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-light/20">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-cream/50">
                <td className="px-5 py-4 text-sm font-medium text-gray-800">
                  {user.name || "—"}
                </td>
                <td className="px-5 py-4 text-sm text-gray-600">{user.email}</td>
                <td className="px-5 py-4 text-sm text-gray-600">
                  {user.phone || "—"}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      user.role === "ADMIN"
                        ? "bg-secondary-light text-secondary"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {user.role === "ADMIN" ? "Admin" : "Usuario"}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-gray-600">
                  {user._count.orders}
                </td>
                <td className="px-5 py-4 text-sm text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString("es-UY")}
                </td>
                <td className="px-5 py-4">
                  <Link
                    href={`/admin/usuarios/${user.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark"
                  >
                    <FiEdit size={14} />
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
