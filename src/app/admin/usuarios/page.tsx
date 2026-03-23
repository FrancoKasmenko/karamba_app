"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  _count: { orders: number };
}

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        setUsers(d);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-gray-400 py-10">Cargando...</div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-800 mb-6">
        Usuarios
      </h1>

      <div className="bg-white rounded-2xl border border-primary-light/30 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-beige text-left">
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                Nombre
              </th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                Email
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
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-light/20">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-cream/50">
                <td className="px-5 py-4 text-sm font-medium text-gray-800">
                  {user.name || "—"}
                </td>
                <td className="px-5 py-4 text-sm text-gray-600">
                  {user.email}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      user.role === "ADMIN"
                        ? "bg-secondary-light text-secondary"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-gray-600">
                  {user._count.orders}
                </td>
                <td className="px-5 py-4 text-sm text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString("es-UY")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
