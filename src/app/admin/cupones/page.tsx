"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Button from "@/components/ui/button";
import { FiPlus, FiTrash2, FiEdit, FiCheck, FiX } from "react-icons/fi";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  active: boolean;
  discountType: "PERCENT" | "FIXED_AMOUNT";
  percentOff: number | null;
  amountOff: number | null;
  validFrom: string | null;
  validUntil: string | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  excludeOnSale: boolean;
  transferOnly: boolean;
  categoryIds: string[];
}

interface CatRow {
  id: string;
  name: string;
  parentId: string | null;
}

function categoryOptions(rows: CatRow[]): { id: string; label: string }[] {
  const byParent = new Map<string | null, CatRow[]>();
  for (const r of rows) {
    const k = r.parentId ?? null;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(r);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }
  const out: { id: string; label: string }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    const kids = byParent.get(parentId) ?? [];
    for (const c of kids) {
      out.push({
        id: c.id,
        label: depth > 0 ? `${"  ".repeat(depth)}└ ${c.name}` : c.name,
      });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

type FormState = {
  code: string;
  description: string;
  active: boolean;
  discountType: "PERCENT" | "FIXED_AMOUNT";
  percentOff: string;
  amountOff: string;
  validFrom: string;
  validUntil: string;
  maxRedemptions: string;
  excludeOnSale: boolean;
  transferOnly: boolean;
  categoryIds: string[];
};

const emptyForm: FormState = {
  code: "",
  description: "",
  active: true,
  discountType: "PERCENT",
  percentOff: "10",
  amountOff: "100",
  validFrom: "",
  validUntil: "",
  maxRedemptions: "",
  excludeOnSale: false,
  transferOnly: false,
  categoryIds: [],
};

export default function AdminCuponesPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [categories, setCategories] = useState<CatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const catOpts = useMemo(() => categoryOptions(categories), [categories]);

  const load = () => {
    Promise.all([
      fetch("/api/admin/coupons").then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
    ])
      .then(([c, cats]) => {
        setCoupons(Array.isArray(c) ? c : []);
        setCategories(Array.isArray(cats) ? cats : []);
      })
      .catch(() => toast.error("Error al cargar"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = () => {
    setEditing(null);
    setCreating(false);
    setForm(emptyForm);
  };

  const startEdit = (c: Coupon) => {
    setEditing(c.id);
    setCreating(false);
    setForm({
      code: c.code,
      description: c.description || "",
      active: c.active,
      discountType: c.discountType,
      percentOff: c.percentOff != null ? String(c.percentOff) : "0",
      amountOff: c.amountOff != null ? String(c.amountOff) : "0",
      validFrom: c.validFrom ? c.validFrom.slice(0, 10) : "",
      validUntil: c.validUntil ? c.validUntil.slice(0, 10) : "",
      maxRedemptions:
        c.maxRedemptions != null ? String(c.maxRedemptions) : "",
      excludeOnSale: c.excludeOnSale,
      transferOnly: c.transferOnly,
      categoryIds: [...c.categoryIds],
    });
  };

  const save = async () => {
    const payload = {
      code: form.code.trim(),
      description: form.description.trim() || null,
      active: form.active,
      discountType: form.discountType,
      percentOff: Number(form.percentOff) || 0,
      amountOff: Number(form.amountOff) || 0,
      validFrom: form.validFrom || null,
      validUntil: form.validUntil || null,
      maxRedemptions: form.maxRedemptions.trim() || null,
      excludeOnSale: form.excludeOnSale,
      transferOnly: form.transferOnly,
      categoryIds: form.categoryIds,
    };

    try {
      if (editing) {
        const res = await fetch(`/api/admin/coupons/${editing}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error || "Error al guardar");
          return;
        }
        toast.success("Cupón actualizado");
      } else {
        const res = await fetch("/api/admin/coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error || "Error al crear");
          return;
        }
        toast.success("Cupón creado");
      }
      cancel();
      load();
    } catch {
      toast.error("Error de red");
    }
  };

  const del = async (id: string) => {
    if (!confirm("¿Eliminar este cupón?")) return;
    const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Eliminado");
      load();
    } else toast.error("No se pudo eliminar");
  };

  const toggleCategory = (id: string) => {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id)
        ? f.categoryIds.filter((x) => x !== id)
        : [...f.categoryIds, id],
    }));
  };

  if (loading) {
    return <p className="text-gray-400 py-10">Cargando…</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-warm-gray">Cupones</h1>
        <Button
          size="sm"
          onClick={() => {
            setCreating(true);
            setEditing(null);
            setForm(emptyForm);
          }}
        >
          <FiPlus className="mr-1" /> Nuevo
        </Button>
      </div>

      <p className="text-sm text-gray-500 mb-6 max-w-3xl">
        Los cupones se validan en el checkout. Podés excluir productos en oferta,
        limitar a transferencia bancaria, restringir por categoría (incluye
        subcategorías si coinciden los padres), y definir vigencia y tope de usos.
        El descuento se reparte proporcionalmente entre las líneas del carrito que
        aplican.
      </p>

      {(creating || editing) && (
        <div className="bg-white rounded-2xl border border-primary-light/30 p-6 mb-8 space-y-4">
          <h2 className="font-bold text-warm-gray">
            {editing ? "Editar cupón" : "Nuevo cupón"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary"
              placeholder="Código (ej. VERANO25)"
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
              }
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
              />
              Activo
            </label>
            <input
              className="sm:col-span-2 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary"
              placeholder="Descripción interna (opcional)"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Tipo
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                value={form.discountType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    discountType: e.target.value as FormState["discountType"],
                  }))
                }
              >
                <option value="PERCENT">Porcentaje</option>
                <option value="FIXED_AMOUNT">Monto fijo ($)</option>
              </select>
            </div>
            {form.discountType === "PERCENT" ? (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  % de descuento
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  value={form.percentOff}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, percentOff: e.target.value }))
                  }
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Monto ($)
                </label>
                <input
                  type="number"
                  min={0}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  value={form.amountOff}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amountOff: e.target.value }))
                  }
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Válido desde (opcional)
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                value={form.validFrom}
                onChange={(e) =>
                  setForm((f) => ({ ...f, validFrom: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Válido hasta (opcional)
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                value={form.validUntil}
                onChange={(e) =>
                  setForm((f) => ({ ...f, validUntil: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Máx. usos totales (vacío = sin límite)
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                placeholder="ej. 100"
                value={form.maxRedemptions}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxRedemptions: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.excludeOnSale}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, excludeOnSale: e.target.checked }))
                  }
                />
                No aplicar a productos en oferta
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.transferOnly}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, transferOnly: e.target.checked }))
                  }
                />
                Solo con pago por transferencia
              </label>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-gray-500 mb-2">
                Categorías permitidas (vacío = todas)
              </p>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 p-2 space-y-1">
                {catOpts.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 text-sm text-warm-gray cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.categoryIds.includes(c.id)}
                      onChange={() => toggleCategory(c.id)}
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void save()}>
              <FiCheck className="mr-1" /> Guardar
            </Button>
            <Button size="sm" variant="ghost" onClick={cancel}>
              <FiX className="mr-1" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {coupons.length === 0 ? (
          <p className="text-gray-400 text-center py-10">No hay cupones.</p>
        ) : (
          coupons.map((c) => (
            <div
              key={c.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl border border-primary-light/25 p-4"
            >
              <div>
                <p className="font-mono font-bold text-primary-dark">{c.code}</p>
                <p className="text-xs text-gray-500">
                  {c.discountType === "PERCENT"
                    ? `${c.percentOff}%`
                    : `$${c.amountOff}`}{" "}
                  · usos: {c.redemptionCount}
                  {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ""}
                  {c.transferOnly ? " · solo transferencia" : ""}
                  {c.excludeOnSale ? " · sin ofertas" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    c.active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {c.active ? "Activo" : "Inactivo"}
                </span>
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-primary"
                  onClick={() => startEdit(c)}
                >
                  <FiEdit size={16} />
                </button>
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-red-500"
                  onClick={() => void del(c.id)}
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
