"use client";
import { api } from "@/lib/public-api";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FiPlus, FiEdit, FiTrash2, FiSearch } from "react-icons/fi";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  active: boolean;
  featured: boolean;
  images: string[];
  variants: { id: string; name: string; value: string }[];
}

export default function AdminProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const loadProducts = useCallback(async (search: string): Promise<Product[]> => {
    try {
      const path =
        search.length > 0
          ? `/api/admin/products?q=${encodeURIComponent(search)}`
          : "/api/admin/products";
      const res = await fetch(api(path));
      const data = await res.json();
      if (Array.isArray(data)) {
        return data as Product[];
      }
      if (data?.error) toast.error(data.error);
      return [];
    } catch {
      toast.error("Error al cargar productos");
      return [];
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadProducts(debouncedQuery).then((list) => {
      if (!cancelled) {
        setProducts(list);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, loadProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;

    setLoading(true);
    try {
      await fetch(api(`/api/admin/products/${id}`), { method: "DELETE" });
      toast.success("Producto eliminado");
      const list = await loadProducts(debouncedQuery);
      setProducts(list);
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-gray-800">
          Productos
        </h1>
        <Link href="/admin/productos/nuevo" className="shrink-0 w-full sm:w-auto">
          <Button className="w-full sm:w-auto justify-center touch-manipulation">
            <FiPlus className="mr-2 shrink-0" /> Nuevo producto
          </Button>
        </Link>
      </div>

      <div className="mb-4">
        <label className="sr-only" htmlFor="admin-product-search">
          Buscar productos
        </label>
        <div className="relative w-full max-w-md">
          <FiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
            aria-hidden
          />
          <input
            id="admin-product-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, descripción o slug…"
            autoComplete="off"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Cargando...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          {debouncedQuery ?
            <>
              No hay productos que coincidan con{" "}
              <span className="font-medium text-gray-600">
                &ldquo;{debouncedQuery}&rdquo;
              </span>
              .
            </>
          : "No hay productos aún. ¡Creá el primero!"}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-primary-light/30 overflow-hidden shadow-sm">
          <div className="overflow-x-auto -mx-px">
            <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="bg-beige text-left">
                <th className="px-3 sm:px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  Producto
                </th>
                <th className="px-3 sm:px-5 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                  Precio
                </th>
                <th className="px-3 sm:px-5 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">
                  Variantes
                </th>
                <th className="px-3 sm:px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-3 sm:px-5 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-light/20">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-cream/50">
                  <td className="px-3 sm:px-5 py-4">
                    <span className="font-medium text-gray-800">
                      {product.name}
                    </span>
                    <p className="sm:hidden text-[11px] text-gray-400 mt-0.5">
                      {product.variants.length} variantes
                    </p>
                  </td>
                  <td className="px-3 sm:px-5 py-4 text-gray-600 whitespace-nowrap">
                    {formatPrice(product.price)}
                  </td>
                  <td className="px-3 sm:px-5 py-4 text-gray-500 hidden sm:table-cell">
                    {product.variants.length} variantes
                  </td>
                  <td className="px-3 sm:px-5 py-4">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        product.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {product.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-3 sm:px-5 py-4">
                    <div className="flex gap-1 sm:gap-2">
                      <Link
                        href={`/admin/productos/${product.id}`}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:text-primary-dark hover:bg-primary-light/15 transition-colors touch-manipulation"
                        aria-label="Editar producto"
                      >
                        <FiEdit size={16} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors touch-manipulation"
                        aria-label="Eliminar producto"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
