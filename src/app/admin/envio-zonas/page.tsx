"use client";

import { api } from "@/lib/public-api";
import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";
import { FiPlus, FiTrash2, FiTruck } from "react-icons/fi";

type Zone = {
  id: string;
  name: string;
  price: number;
  departmentNames: string[];
  cityNames: string[];
  active: boolean;
  sortOrder: number;
};

function linesToArray(s: string): string[] {
  return s
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function AdminShippingZonesPage() {
  const [rows, setRows] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | "new" | null>(null);

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("250");
  const [newDepts, setNewDepts] = useState("Montevideo");
  const [newCities, setNewCities] = useState("");

  const load = () => {
    fetch(api("/api/admin/shipping-zones"))
      .then((r) => r.json())
      .then((d: Zone[]) => {
        if (Array.isArray(d)) setRows(d);
        else setRows([]);
      })
      .catch(() => toast.error("Error al cargar zonas"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const createZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingId("new");
    try {
      const res = await fetch(api("/api/admin/shipping-zones"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          price: Number(newPrice),
          departmentNames: linesToArray(newDepts),
          cityNames: linesToArray(newCities),
          active: true,
          sortOrder: rows.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo crear");
        return;
      }
      toast.success("Zona creada");
      setNewName("");
      setNewPrice("250");
      setNewDepts("Montevideo");
      setNewCities("");
      load();
    } catch {
      toast.error("Error de red");
    }
    setSavingId(null);
  };

  const patch = async (z: Zone, patchBody: Partial<Zone>) => {
    setSavingId(z.id);
    try {
      const res = await fetch(api(`/api/admin/shipping-zones/${z.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al guardar");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === z.id ? { ...r, ...data } : r)));
      toast.success("Guardado");
    } catch {
      toast.error("Error de red");
    }
    setSavingId(null);
  };

  const remove = async (z: Zone) => {
    if (!confirm(`¿Eliminar zona «${z.name}»?`)) return;
    setSavingId(z.id);
    try {
      const res = await fetch(api(`/api/admin/shipping-zones/${z.id}`), {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Error");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== z.id));
      toast.success("Eliminada");
    } catch {
      toast.error("Error de red");
    }
    setSavingId(null);
  };

  if (loading) {
    return <div className="text-gray-400 py-10">Cargando zonas…</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <FiTruck className="text-primary-dark" size={28} />
        <h1 className="font-display text-2xl font-bold text-warm-gray">
          Zonas de envío
        </h1>
      </div>
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">
        Coincidencia por departamento y/o ciudad (sin distinguir tildes). Si una
        fila tiene ambos listas, deben cumplirse los dos. Orden: primero{" "}
        <code className="bg-soft-gray px-1 rounded text-xs">sortOrder</code>{" "}
        menor.
      </p>

      <form
        onSubmit={createZone}
        className="mb-10 max-w-2xl bg-white rounded-2xl border border-gray-100 p-6 space-y-4 shadow-sm"
      >
        <h2 className="font-semibold text-warm-gray flex items-center gap-2">
          <FiPlus size={18} /> Nueva zona
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600">Nombre</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej. Montevideo capital"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">
              Precio (UYU)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
              required
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">
            Departamentos (uno por línea o separados por coma)
          </label>
          <textarea
            value={newDepts}
            onChange={(e) => setNewDepts(e.target.value)}
            rows={2}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">
            Ciudades (opcional; vacío = cualquier ciudad del depto)
          </label>
          <textarea
            value={newCities}
            onChange={(e) => setNewCities(e.target.value)}
            rows={2}
            placeholder="Ej. Montevideo, Ciudad de la Costa…"
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono"
          />
        </div>
        <Button type="submit" disabled={savingId === "new"}>
          {savingId === "new" ? "Creando…" : "Crear zona"}
        </Button>
      </form>

      <div className="space-y-4 max-w-3xl">
        {rows.map((z) => (
          <ZoneRow
            key={z.id}
            zone={z}
            busy={savingId === z.id}
            onPatch={patch}
            onDelete={remove}
          />
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-gray-500">
            No hay zonas. Creá al menos una (ej. Montevideo) para cobrar envío en
            checkout.
          </p>
        )}
      </div>
    </div>
  );
}

function ZoneRow({
  zone,
  busy,
  onPatch,
  onDelete,
}: {
  zone: Zone;
  busy: boolean;
  onPatch: (z: Zone, p: Partial<Zone>) => void;
  onDelete: (z: Zone) => void;
}) {
  const [name, setName] = useState(zone.name);
  const [price, setPrice] = useState(String(zone.price));
  const [depts, setDepts] = useState(zone.departmentNames.join("\n"));
  const [cities, setCities] = useState(zone.cityNames.join("\n"));

  useEffect(() => {
    setName(zone.name);
    setPrice(String(zone.price));
    setDepts(zone.departmentNames.join("\n"));
    setCities(zone.cityNames.join("\n"));
  }, [zone]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-gray-400 font-mono">{zone.id.slice(0, 8)}…</span>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={zone.active}
            onChange={(e) => onPatch(zone, { active: e.target.checked })}
            disabled={busy}
          />
          Activa
        </label>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600">Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Precio</label>
          <input
            type="number"
            min={0}
            step={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600">Departamentos</label>
        <textarea
          value={depts}
          onChange={(e) => setDepts(e.target.value)}
          rows={2}
          className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600">Ciudades</label>
        <textarea
          value={cities}
          onChange={(e) => setCities(e.target.value)}
          rows={2}
          className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() =>
            onPatch(zone, {
              name: name.trim(),
              price: Number(price),
              departmentNames: linesToArray(depts),
              cityNames: linesToArray(cities),
            })
          }
        >
          Guardar cambios
        </Button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(zone)}
          className="inline-flex items-center gap-1 text-sm text-red-600 px-3 py-2 rounded-xl hover:bg-red-50"
        >
          <FiTrash2 size={14} /> Eliminar
        </button>
      </div>
    </div>
  );
}
