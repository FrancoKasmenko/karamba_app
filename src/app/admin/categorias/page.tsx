"use client";

import { useEffect, useState } from "react";
import { FiPlus, FiTrash2, FiEdit, FiCheck, FiX } from "react-icons/fi";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  parentId: string | null;
  showInNavbar: boolean;
  parent: { name: string } | null;
  children: { id: string; name: string; slug: string }[];
}

export default function AdminCategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    parentId: "",
    order: 0,
    showInNavbar: false,
  });

  const fetchCategories = async () => {
    const res = await fetch("/api/admin/categories");
    setCategories(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const parentOptions = categories.filter((c) => !c.parentId);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    try {
      if (editing) {
        await fetch(`/api/admin/categories/${editing}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            showInNavbar: !form.parentId && form.showInNavbar,
          }),
        });
        toast.success("Categor\u00eda actualizada");
      } else {
        await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            showInNavbar: !form.parentId && form.showInNavbar,
          }),
        });
        toast.success("Categor\u00eda creada");
      }
      setEditing(null);
      setCreating(false);
      setForm({ name: "", parentId: "", order: 0, showInNavbar: false });
      fetchCategories();
    } catch {
      toast.error("Error al guardar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("\u00bfEliminar esta categor\u00eda?")) return;
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Categor\u00eda eliminada");
      fetchCategories();
    } else {
      toast.error("No se puede eliminar (tiene productos o subcategor\u00edas)");
    }
  };

  const startEdit = (cat: Category) => {
    setEditing(cat.id);
    setCreating(false);
    setForm({
      name: cat.name,
      parentId: cat.parentId || "",
      order: cat.order,
      showInNavbar: Boolean(cat.showInNavbar),
    });
  };

  const toggleNavbar = async (cat: Category) => {
    if (cat.parentId) return;
    try {
      await fetch(`/api/admin/categories/${cat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cat.name,
          parentId: cat.parentId || "",
          order: cat.order,
          showInNavbar: !cat.showInNavbar,
        }),
      });
      toast.success(cat.showInNavbar ? "Oculta del navbar" : "Visible en navbar");
      fetchCategories();
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const cancel = () => {
    setEditing(null);
    setCreating(false);
    setForm({ name: "", parentId: "", order: 0, showInNavbar: false });
  };

  if (loading) return <div className="text-gray-400 py-10">Cargando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-warm-gray">
          Categor&iacute;as
        </h1>
        <Button
          onClick={() => {
            setCreating(true);
            setEditing(null);
            setForm({ name: "", parentId: "", order: 0, showInNavbar: false });
          }}
          size="sm"
        >
          <FiPlus className="mr-1" /> Nueva
        </Button>
      </div>

      {(creating || editing) && (
        <div className="bg-white rounded-2xl border border-primary-light/30 p-6 mb-6">
          <h3 className="font-bold text-warm-gray mb-4">
            {editing ? "Editar Categor\u00eda" : "Nueva Categor\u00eda"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Nombre *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary"
            />
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary"
            >
              <option value="">Sin padre (categor\u00eda ra\u00edz)</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Orden"
              value={form.order}
              onChange={(e) =>
                setForm({ ...form, order: parseInt(e.target.value) || 0 })
              }
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary"
            />
            <label className="sm:col-span-3 flex items-center gap-2 text-sm text-warm-gray cursor-pointer">
              <input
                type="checkbox"
                checked={form.showInNavbar && !form.parentId}
                disabled={Boolean(form.parentId)}
                onChange={(e) =>
                  setForm({ ...form, showInNavbar: e.target.checked })
                }
                className="rounded border-gray-300 text-primary"
              />
              Mostrar en navbar (solo categorías raíz)
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave} size="sm">
              <FiCheck className="mr-1" /> Guardar
            </Button>
            <Button onClick={cancel} size="sm" variant="ghost">
              <FiX className="mr-1" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <p className="text-gray-400 text-center py-10">
          No hay categor\u00edas. Cre\u00e1 la primera.
        </p>
      ) : (
        <div className="bg-white rounded-2xl border border-primary-light/30 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-beige text-left">
                <th className="px-5 py-3 text-xs font-semibold text-warm-gray uppercase">
                  Nombre
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-warm-gray uppercase">
                  Padre
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-warm-gray uppercase">
                  Subcategor&iacute;as
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-warm-gray uppercase">
                  Navbar
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-warm-gray uppercase">
                  Orden
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-warm-gray uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-light/20">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-cream/50">
                  <td className="px-5 py-3">
                    <span
                      className={`text-sm ${cat.parentId ? "pl-4 text-gray-500" : "font-semibold text-warm-gray"}`}
                    >
                      {cat.parentId && "└ "}
                      {cat.name}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {cat.parent?.name || "—"}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {cat.children.length > 0
                      ? cat.children.map((c) => c.name).join(", ")
                      : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {!cat.parentId ? (
                      <button
                        type="button"
                        onClick={() => toggleNavbar(cat)}
                        className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full transition-colors ${
                          cat.showInNavbar
                            ? "bg-secondary-light/60 text-secondary-dark"
                            : "bg-soft-gray text-gray-400"
                        }`}
                      >
                        {cat.showInNavbar ? "Sí" : "No"}
                      </button>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-400">
                    {cat.order}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-2 text-gray-400 hover:text-primary"
                      >
                        <FiEdit size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
