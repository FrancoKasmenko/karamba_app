"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FiPlus,
  FiTrash2,
  FiCheck,
  FiX,
  FiMenu,
} from "react-icons/fi";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";
import {
  buildCategoryTree,
  type CategoryBranch,
} from "@/lib/category-tree";

interface FlatCategory {
  id: string;
  name: string;
  slug: string;
  order: number;
  parentId: string | null;
  showInNavbar: boolean;
  image: string | null;
}

function findSortContext(
  nodes: CategoryBranch[],
  id: string,
  parentId: string | null = null
): {
  siblings: CategoryBranch[];
  index: number;
  parentId: string | null;
} | null {
  const ix = nodes.findIndex((n) => n.id === id);
  if (ix >= 0) {
    return { siblings: nodes, index: ix, parentId };
  }
  for (const n of nodes) {
    const inner = findSortContext(n.children, id, n.id);
    if (inner) return inner;
  }
  return null;
}

function SortableRow({
  node,
  depth,
  flat,
  rootOptions,
  onDelete,
  onToggleNavbar,
  editingNameId,
  setEditingNameId,
  draftName,
  setDraftName,
  saveName,
  changeParent,
}: {
  node: CategoryBranch;
  depth: number;
  flat: FlatCategory[];
  rootOptions: FlatCategory[];
  onDelete: (id: string) => void;
  onToggleNavbar: (cat: FlatCategory) => void;
  editingNameId: string | null;
  setEditingNameId: (id: string | null) => void;
  draftName: string;
  setDraftName: (s: string) => void;
  saveName: (id: string) => Promise<void>;
  changeParent: (id: string, parentId: string | null) => Promise<void>;
}) {
  const cat = flat.find((c) => c.id === node.id);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  if (!cat) return null;

  const isEditingName = editingNameId === node.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-wrap items-center gap-2 py-2.5 px-3 rounded-xl border border-primary-light/25 bg-white/90 ${
        depth ? "ml-4 sm:ml-8" : ""
      }`}
    >
      <button
        type="button"
        className="touch-none p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light/20 cursor-grab active:cursor-grabbing"
        aria-label="Arrastrar para reordenar"
        {...attributes}
        {...listeners}
      >
        <FiMenu size={18} />
      </button>

      {isEditingName ? (
        <input
          autoFocus
          className="flex-1 min-w-[140px] px-2 py-1.5 rounded-lg border border-primary text-sm"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={() => void saveName(node.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setEditingNameId(null);
              setDraftName(cat.name);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="flex-1 min-w-[120px] text-left text-sm font-semibold text-warm-gray hover:text-primary"
          onClick={() => {
            setEditingNameId(node.id);
            setDraftName(cat.name);
          }}
        >
          {cat.name}
        </button>
      )}

      <select
        className="text-xs sm:text-sm px-2 py-1.5 rounded-lg border border-gray-200 max-w-[200px]"
        value={cat.parentId ?? ""}
        onChange={(e) =>
          void changeParent(
            cat.id,
            e.target.value ? e.target.value : null
          )
        }
      >
        <option value="">Raíz</option>
        {rootOptions
          .filter((r) => r.id !== cat.id)
          .map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
      </select>

      {!cat.parentId ? (
        <button
          type="button"
          onClick={() => onToggleNavbar(cat)}
          className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
            cat.showInNavbar
              ? "bg-secondary-light/60 text-secondary-dark"
              : "bg-soft-gray text-gray-400"
          }`}
        >
          Navbar {cat.showInNavbar ? "sí" : "no"}
        </button>
      ) : (
        <span className="text-[10px] text-gray-300 w-16 text-center">—</span>
      )}

      <div className="flex gap-1 ml-auto">
        <button
          type="button"
          onClick={() => onDelete(cat.id)}
          className="p-2 text-gray-400 hover:text-red-500 rounded-lg"
          aria-label="Eliminar"
        >
          <FiTrash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function CategorySubtree({
  nodes,
  depth,
  flat,
  rootOptions,
  onDelete,
  onToggleNavbar,
  editingNameId,
  setEditingNameId,
  draftName,
  setDraftName,
  saveName,
  changeParent,
}: {
  nodes: CategoryBranch[];
  depth: number;
  flat: FlatCategory[];
  rootOptions: FlatCategory[];
  onDelete: (id: string) => void;
  onToggleNavbar: (cat: FlatCategory) => void;
  editingNameId: string | null;
  setEditingNameId: (id: string | null) => void;
  draftName: string;
  setDraftName: (s: string) => void;
  saveName: (id: string) => Promise<void>;
  changeParent: (id: string, parentId: string | null) => Promise<void>;
}) {
  const ids = useMemo(() => nodes.map((n) => n.id), [nodes]);
  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div className={depth ? "space-y-2 pl-2 border-l-2 border-primary-light/20 ml-2" : "space-y-2"}>
        {nodes.map((node) => (
          <div key={node.id} className="space-y-2">
            <SortableRow
              node={node}
              depth={depth}
              flat={flat}
              rootOptions={rootOptions}
              onDelete={onDelete}
              onToggleNavbar={onToggleNavbar}
              editingNameId={editingNameId}
              setEditingNameId={setEditingNameId}
              draftName={draftName}
              setDraftName={setDraftName}
              saveName={saveName}
              changeParent={changeParent}
            />
            {node.children.length > 0 && (
              <CategorySubtree
                nodes={node.children}
                depth={depth + 1}
                flat={flat}
                rootOptions={rootOptions}
                onDelete={onDelete}
                onToggleNavbar={onToggleNavbar}
                editingNameId={editingNameId}
                setEditingNameId={setEditingNameId}
                draftName={draftName}
                setDraftName={setDraftName}
                saveName={saveName}
                changeParent={changeParent}
              />
            )}
          </div>
        ))}
      </div>
    </SortableContext>
  );
}

export default function AdminCategoriasPage() {
  const [flat, setFlat] = useState<FlatCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    parentId: "",
    order: 0,
    showInNavbar: false,
  });
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/admin/categories");
    if (!res.ok) {
      toast.error("No se pudieron cargar las categorías");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as FlatCategory[];
    setFlat(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const tree = useMemo(
    () =>
      buildCategoryTree(
        flat.map((c) => ({
          id: c.id,
          parentId: c.parentId,
          name: c.name,
          slug: c.slug,
          order: c.order,
        }))
      ),
    [flat]
  );

  const rootOptions = useMemo(
    () => flat.filter((c) => !c.parentId),
    [flat]
  );

  const persistReorder = async (
    updates: { id: string; order: number; parentId: string | null }[]
  ) => {
    const res = await fetch("/api/admin/categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: updates }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "No se pudo guardar el orden");
      return;
    }
    toast.success("Orden guardado");
    await fetchCategories();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ctx = findSortContext(tree, String(active.id));
    if (!ctx) return;
    const overId = String(over.id);
    if (!ctx.siblings.some((s) => s.id === overId)) return;
    const oldIndex = ctx.index;
    const newIndex = ctx.siblings.findIndex((s) => s.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(ctx.siblings, oldIndex, newIndex);
    const updates = reordered.map((s, i) => ({
      id: s.id,
      order: i,
      parentId: ctx.parentId,
    }));
    void persistReorder(updates);
  };

  const saveName = async (id: string) => {
    const cat = flat.find((c) => c.id === id);
    if (!cat) {
      setEditingNameId(null);
      return;
    }
    const next = draftName.trim();
    if (!next) {
      toast.error("El nombre no puede estar vacío");
      setDraftName(cat.name);
      setEditingNameId(null);
      return;
    }
    if (next === cat.name) {
      setEditingNameId(null);
      return;
    }
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: next,
        parentId: cat.parentId ?? "",
        order: cat.order,
        showInNavbar: cat.showInNavbar,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "No se pudo guardar");
      setDraftName(cat.name);
      setEditingNameId(null);
      return;
    }
    toast.success("Nombre actualizado");
    setEditingNameId(null);
    await fetchCategories();
  };

  const changeParent = async (catId: string, newParentId: string | null) => {
    const cat = flat.find((c) => c.id === catId);
    if (!cat) return;
    if ((cat.parentId ?? null) === newParentId) return;
    const others = flat.filter(
      (c) =>
        (c.parentId ?? null) === (newParentId ?? null) && c.id !== catId
    );
    const maxOrder = others.reduce((m, s) => Math.max(m, s.order), -1);
    const res = await fetch(`/api/admin/categories/${catId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: cat.name,
        parentId: newParentId ?? "",
        order: maxOrder + 1,
        showInNavbar: newParentId ? false : cat.showInNavbar,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "No se pudo mover");
      await fetchCategories();
      return;
    }
    toast.success("Categoría actualizada");
    await fetchCategories();
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        showInNavbar: !form.parentId && form.showInNavbar,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Error al crear");
      return;
    }
    toast.success("Categoría creada");
    setCreating(false);
    setForm({ name: "", parentId: "", order: 0, showInNavbar: false });
    await fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("\u00bfEliminar esta categor\u00eda?")) return;
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Categor\u00eda eliminada");
      await fetchCategories();
    } else {
      toast.error("No se puede eliminar (tiene productos o subcategor\u00edas)");
    }
  };

  const toggleNavbar = async (cat: FlatCategory) => {
    if (cat.parentId) return;
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: cat.name,
        parentId: cat.parentId ?? "",
        order: cat.order,
        showInNavbar: !cat.showInNavbar,
      }),
    });
    if (!res.ok) {
      toast.error("Error al actualizar");
      return;
    }
    toast.success(cat.showInNavbar ? "Oculta del navbar" : "Visible en navbar");
    await fetchCategories();
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
            setForm({ name: "", parentId: "", order: 0, showInNavbar: false });
          }}
          size="sm"
        >
          <FiPlus className="mr-1" /> Nueva
        </Button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Arrastrá por el ícono de menú para ordenar dentro del mismo nivel (navbar
        respeta el orden de las raíces). Editá el nombre al hacer clic. Cambiá el
        padre con el desplegable.
      </p>

      {creating && (
        <div className="bg-white rounded-2xl border border-primary-light/30 p-6 mb-6">
          <h3 className="font-bold text-warm-gray mb-4">Nueva categoría</h3>
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
              <option value="">Sin padre (raíz)</option>
              {rootOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Orden (opcional)"
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
              Mostrar en navbar (solo raíz)
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => void handleCreate()} size="sm">
              <FiCheck className="mr-1" /> Guardar
            </Button>
            <Button
              onClick={() => setCreating(false)}
              size="sm"
              variant="ghost"
            >
              <FiX className="mr-1" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      {flat.length === 0 ? (
        <p className="text-gray-400 text-center py-10">
          No hay categorías. Creá la primera.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="bg-cream/40 rounded-2xl border border-primary-light/30 p-4 sm:p-5">
            <CategorySubtree
              nodes={tree}
              depth={0}
              flat={flat}
              rootOptions={rootOptions}
              onDelete={handleDelete}
              onToggleNavbar={toggleNavbar}
              editingNameId={editingNameId}
              setEditingNameId={setEditingNameId}
              draftName={draftName}
              setDraftName={setDraftName}
              saveName={saveName}
              changeParent={changeParent}
            />
          </div>
        </DndContext>
      )}
    </div>
  );
}
