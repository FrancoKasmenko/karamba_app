"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";
import { FiPlus, FiTrash2, FiEdit2, FiSave, FiX } from "react-icons/fi";
import BankLogo from "@/components/ui/bank-logo";

interface Row {
  id: string;
  holderName: string;
  accountNumber: string;
  bankName: string;
  bankKey: string;
  active: boolean;
  sortOrder: number;
}

const BANK_KEYS = [
  { value: "itau", label: "ITAÚ" },
  { value: "brou", label: "BROU" },
  { value: "scotiabank", label: "Scotiabank" },
  { value: "midinero", label: "Midinero" },
  { value: "giro", label: "Giro / redes" },
  { value: "generic", label: "Otro / genérico" },
];

export default function CuentasPagoPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState({
    holderName: "",
    accountNumber: "",
    bankName: "",
    bankKey: "generic",
    active: true,
    sortOrder: 0,
  });

  const load = () => {
    fetch("/api/admin/payment-accounts")
      .then((r) => r.json())
      .then(setRows)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setEditing("new");
    setForm({
      holderName: "",
      accountNumber: "",
      bankName: "",
      bankKey: "generic",
      active: true,
      sortOrder: rows.length,
    });
  };

  const startEdit = (r: Row) => {
    setEditing(r.id);
    setForm({
      holderName: r.holderName,
      accountNumber: r.accountNumber,
      bankName: r.bankName,
      bankKey: r.bankKey,
      active: r.active,
      sortOrder: r.sortOrder,
    });
  };

  const cancel = () => {
    setEditing(null);
  };

  const save = async () => {
    if (!form.holderName.trim() || !form.accountNumber.trim() || !form.bankName.trim()) {
      toast.error("Completá titular, número y banco");
      return;
    }
    try {
      if (editing === "new") {
        const res = await fetch("/api/admin/payment-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        toast.success("Cuenta creada");
      } else if (editing) {
        const res = await fetch(`/api/admin/payment-accounts/${editing}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        toast.success("Cuenta actualizada");
      }
      setEditing(null);
      load();
    } catch {
      toast.error("Error al guardar");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta cuenta?")) return;
    const res = await fetch(`/api/admin/payment-accounts/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Eliminada");
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || "No se pudo eliminar");
    }
  };

  if (loading) return <div className="text-gray-400 py-12">Cargando…</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-warm-gray">Cuentas de pago</h1>
          <p className="text-sm text-gray-500 mt-1">
            Datos que ven los clientes al elegir transferencia bancaria
          </p>
        </div>
        <Button type="button" onClick={startNew} size="sm" className="gap-1.5">
          <FiPlus size={16} /> Nueva cuenta
        </Button>
      </div>

      {editing && (
        <div className="mb-8 rounded-2xl border border-primary-light/40 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-warm-gray text-sm">
              {editing === "new" ? "Nueva cuenta" : "Editar cuenta"}
            </h2>
            <button
              type="button"
              onClick={cancel}
              className="p-2 rounded-lg text-gray-400 hover:bg-soft-gray"
            >
              <FiX size={18} />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-500">Titular</label>
              <input
                value={form.holderName}
                onChange={(e) => setForm({ ...form, holderName: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Número / alias</label>
              <input
                value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Banco (texto)</label>
              <input
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Marca / logo</label>
              <select
                value={form.bankKey}
                onChange={(e) => setForm({ ...form, bankKey: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
              >
                {BANK_KEYS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Orden</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
                }
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 sm:col-span-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="rounded border-gray-300 text-primary"
              />
              <span className="text-sm text-gray-600">Visible en checkout</span>
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={save} className="gap-1.5">
              <FiSave size={16} /> Guardar
            </Button>
            <Button type="button" variant="outline" onClick={cancel}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rows.length === 0 && !editing && (
          <p className="text-gray-400 text-sm py-8 text-center rounded-2xl border border-dashed border-primary-light/50">
            No hay cuentas. Creá la primera o ejecutá el seed.
          </p>
        )}
        {rows.map((r) => (
          <div
            key={r.id}
            className={`flex flex-wrap items-center gap-4 rounded-2xl border p-4 transition-shadow ${
              r.active
                ? "border-primary-light/35 bg-white shadow-sm"
                : "border-gray-100 bg-soft-gray/40 opacity-70"
            }`}
          >
            <BankLogo bankKey={r.bankKey} bankName={r.bankName} size={52} />
            <div className="flex-1 min-w-[200px]">
              <p className="font-bold text-warm-gray">{r.bankName}</p>
              <p className="text-sm text-gray-600">{r.holderName}</p>
              <p className="text-sm font-mono text-primary-dark mt-0.5">{r.accountNumber}</p>
              {!r.active && (
                <span className="text-[10px] font-bold uppercase text-gray-400 mt-1 inline-block">
                  Oculta
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => startEdit(r)}
                className="p-2.5 rounded-xl text-gray-500 hover:bg-primary-light/20 hover:text-primary-dark transition-colors"
                aria-label="Editar"
              >
                <FiEdit2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => remove(r.id)}
                className="p-2.5 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                aria-label="Eliminar"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
