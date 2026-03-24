"use client";

import { Fragment, useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiSliders, FiX } from "react-icons/fi";
import ProductCard from "@/components/ui/product-card";
import type { CategoryBranch } from "@/lib/category-tree";
import {
  flattenCategorySlugs,
  getDescendantSlugsForSlug,
  findCategoryLabelBySlug,
} from "@/lib/category-tree";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  images: string[];
  imageUrl: string | null;
  featured: boolean;
  isDigital: boolean;
  category: { name: string; slug: string } | null;
}

function CategoryOptions({
  nodes,
  depth = 0,
}: {
  nodes: CategoryBranch[];
  depth?: number;
}) {
  const prefix = depth > 0 ? `${"\u2014 ".repeat(depth)}` : "";
  return (
    <>
      {nodes.map((n) => (
        <Fragment key={n.id}>
          <option value={n.slug}>
            {prefix}
            {n.name}
            {n.children.length > 0 ? " (todo)" : ""}
          </option>
          <CategoryOptions nodes={n.children} depth={depth + 1} />
        </Fragment>
      ))}
    </>
  );
}

export default function ProductsClient({
  initialProducts,
  categories,
}: {
  initialProducts: Product[];
  categories: CategoryBranch[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("categoria") || "";
  const initialQuery = searchParams.get("q") || "";
  const nuevosOnly = searchParams.get("nuevos") === "1";

  const [search, setSearch] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 99999]);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setSelectedCategory(searchParams.get("categoria") || "");
    setSearch(searchParams.get("q") || "");
  }, [searchParams]);

  const replaceProductosQuery = (mutate: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(searchParams.toString());
    mutate(p);
    const qs = p.toString();
    router.replace(qs ? `/productos?${qs}` : "/productos", { scroll: false });
  };

  const allCategorySlugs = useMemo(
    () => flattenCategorySlugs(categories),
    [categories]
  );

  const filtered = useMemo(() => {
    let result = [...initialProducts];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category?.name.toLowerCase().includes(q)
      );
    }

    if (nuevosOnly) {
      result = result.filter((p) => p.featured);
    }

    if (selectedCategory && allCategorySlugs.includes(selectedCategory)) {
      const allowed = getDescendantSlugsForSlug(
        categories,
        selectedCategory
      );
      if (allowed?.length) {
        result = result.filter((p) =>
          p.category?.slug ? allowed.includes(p.category.slug) : false
        );
      }
    }

    result = result.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    switch (sortBy) {
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    return result;
  }, [
    initialProducts,
    search,
    selectedCategory,
    priceRange,
    sortBy,
    categories,
    allCategorySlugs,
    nuevosOnly,
  ]);

  const clearFilters = () => {
    setPriceRange([0, 99999]);
    setSortBy("newest");
    router.replace("/productos", { scroll: false });
  };

  const hasActiveFilters =
    search || selectedCategory || sortBy !== "newest" || nuevosOnly;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-warm-gray">
          Nuestros Productos
        </h1>
        <p className="mt-2 text-gray-500">
          Cada pieza es &uacute;nica y hecha con amor
        </p>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 flex items-center bg-white rounded-xl border border-primary-light/40 px-4 py-2.5 shadow-sm focus-within:border-primary transition-colors">
          <FiSearch size={18} className="text-gray-400 mr-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              <FiX size={16} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2.5 bg-white border border-primary-light/40 rounded-xl text-sm text-warm-gray outline-none focus:border-primary shadow-sm"
          >
            <option value="newest">M&aacute;s recientes</option>
            <option value="price-asc">Menor precio</option>
            <option value="price-desc">Mayor precio</option>
            <option value="name">A-Z</option>
          </select>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors shadow-sm ${
              filtersOpen
                ? "bg-primary text-white border-primary"
                : "bg-white text-warm-gray border-primary-light/40 hover:border-primary"
            }`}
          >
            <FiSliders size={16} />
            Filtros
          </button>
        </div>
      </div>

      {/* Expanded filters */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-white rounded-2xl border border-primary-light/30 p-5 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Category filter */}
                <div>
                  <label className="block text-xs font-semibold text-warm-gray mb-2 uppercase tracking-wider">
                    Categor&iacute;a
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      const v = e.target.value;
                      replaceProductosQuery((p) => {
                        if (v) p.set("categoria", v);
                        else p.delete("categoria");
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary"
                  >
                    <option value="">Todas</option>
                    <CategoryOptions nodes={categories} />
                  </select>
                </div>

                {/* Price range */}
                <div>
                  <label className="block text-xs font-semibold text-warm-gray mb-2 uppercase tracking-wider">
                    Precio m&iacute;nimo
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={priceRange[0] || ""}
                    onChange={(e) =>
                      setPriceRange([Number(e.target.value) || 0, priceRange[1]])
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-warm-gray mb-2 uppercase tracking-wider">
                    Precio m&aacute;ximo
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={priceRange[1] === 99999 ? "" : priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([priceRange[0], Number(e.target.value) || 99999])
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary"
                    placeholder="Sin l\u00edmite"
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-xs text-primary font-semibold hover:underline"
                >
                  Limpiar todos los filtros
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filters badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedCategory && (
            <span className="inline-flex items-center gap-1 bg-primary-light/30 text-primary-dark text-xs font-medium px-3 py-1.5 rounded-full">
              {findCategoryLabelBySlug(categories, selectedCategory) ||
                selectedCategory}
              <button
                type="button"
                onClick={() =>
                  replaceProductosQuery((p) => p.delete("categoria"))
                }
              >
                <FiX size={12} />
              </button>
            </span>
          )}
          {search && (
            <span className="inline-flex items-center gap-1 bg-accent-light/50 text-accent-dark text-xs font-medium px-3 py-1.5 rounded-full">
              &ldquo;{search}&rdquo;
              <button
                type="button"
                onClick={() => replaceProductosQuery((p) => p.delete("q"))}
              >
                <FiX size={12} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg mb-2">
            No encontramos productos
          </p>
          <p className="text-gray-400 text-sm">
            Prob&aacute; cambiando los filtros o buscar otra cosa
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-primary font-semibold text-sm hover:underline"
            >
              Ver todos los productos
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-4">
            {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                slug={product.slug}
                price={product.price}
                comparePrice={product.comparePrice}
                imageUrl={product.imageUrl}
                images={product.images}
                isDigital={product.isDigital}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
