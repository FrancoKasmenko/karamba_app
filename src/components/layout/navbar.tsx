"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiShoppingBag,
  FiUser,
  FiMenu,
  FiX,
  FiSearch,
  FiChevronDown,
  FiChevronRight,
  FiRadio,
  FiBookOpen,
  FiPlayCircle,
  FiCpu,
} from "react-icons/fi";
import { useCartStore } from "@/store/cart";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  children: { id: string; name: string; slug: string }[];
}

function LiveBadge() {
  const [isLive, setIsLive] = useState(false);

  const checkLive = useCallback(() => {
    fetch("/api/youtube/status")
      .then((r) => r.json())
      .then((d) => setIsLive(d.isLive === true))
      .catch(() => setIsLive(false));
  }, []);

  useEffect(() => {
    checkLive();
    const interval = setInterval(checkLive, 120_000);
    return () => clearInterval(interval);
  }, [checkLive]);

  if (!isLive) return null;

  return (
    <Link
      href="/podcast"
      className="inline-flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full hover:bg-red-600 transition-all shrink-0"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
      </span>
      VIVO
    </Link>
  );
}

export default function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isDigital = pathname === "/soluciones-digitales";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [mobileCatOpen, setMobileCatOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<{
    catId: string;
    top: number;
    left: number;
    children: { id: string; name: string; slug: string }[];
  } | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const rawCount = useCartStore((s) => s.itemCount());
  const itemCount = mounted ? rawCount : 0;
  const searchRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const handleCatEnter = (cat: CategoryItem, anchor: HTMLElement) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (cat.children.length === 0) {
      setOpenMenu(null);
      return;
    }
    const r = anchor.getBoundingClientRect();
    setOpenMenu({
      catId: cat.id,
      top: r.bottom,
      left: r.left,
      children: cat.children,
    });
  };

  const handleCatLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setOpenMenu(null), 180);
  };

  const cancelMenuClose = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [openMenu]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/productos?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
      setMobileOpen(false);
    }
  };

  const closeMobile = () => {
    setMobileOpen(false);
    setMobileMoreOpen(false);
    setMobileCatOpen(false);
  };

  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-50 mx-2 sm:mx-4 lg:mx-8 mt-2 flex flex-col rounded-2xl backdrop-blur-md overflow-visible",
          isDigital
            ? "border border-white/10 bg-zinc-950/92 shadow-[0_12px_48px_-16px_rgba(0,0,0,0.65),0_0_0_1px_rgba(52,211,153,0.06)_inset]"
            : "border border-primary-light/40 bg-white/95 shadow-sm"
        )}
      >
        {/* —— Navbar principal —— */}
        <header
          className={cn(
            "border-b",
            isDigital ? "border-white/10" : "border-primary-light/25"
          )}
        >
          <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
            <div className="flex min-h-14 sm:min-h-[3.25rem] items-center justify-between gap-2 py-1">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
                <Link href="/" className="flex items-center shrink-0">
                  <Image
                    src="/img/karamba.png"
                    alt="Karamba"
                    width={140}
                    height={45}
                    className={cn(
                      "h-[30px] sm:h-[38px] w-auto object-contain",
                      isDigital && "drop-shadow-[0_0_12px_rgba(52,211,153,0.15)]"
                    )}
                    priority
                  />
                </Link>
                {mounted && (
                  <span className="hidden md:inline-flex">
                    <LiveBadge />
                  </span>
                )}
              </div>

              {/* Desktop: una sola fila; scroll horizontal suave si no entra (evita saltos de línea) */}
              <nav
                className={cn(
                  "hidden lg:flex flex-1 min-w-0 items-center justify-center gap-0 flex-nowrap overflow-x-auto overscroll-x-contain",
                  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                )}
              >
                <MainNavLink href="/" isDigital={isDigital}>
                  Inicio
                </MainNavLink>
                <MainNavLink href="/productos" isDigital={isDigital}>
                  Productos
                </MainNavLink>
                <MainNavLink href="/productos?nuevos=1" isDigital={isDigital}>
                  Nuevos
                </MainNavLink>
                <MainNavLink href="/cursos" isDigital={isDigital}>
                  <span className="inline-flex items-center gap-1 xl:gap-1.5">
                    <FiBookOpen size={13} className="opacity-80 shrink-0" />
                    Cursos
                  </span>
                </MainNavLink>
                <MainNavLink
                  href="/cursos-online"
                  isDigital={isDigital}
                  title="Cursos online"
                >
                  <span className="inline-flex items-center gap-1 xl:gap-1.5">
                    <FiPlayCircle size={13} className="opacity-80 shrink-0" />
                    <span className="xl:hidden">Online</span>
                    <span className="hidden xl:inline">Cursos online</span>
                  </span>
                </MainNavLink>
                {session && (
                  <MainNavLink
                    href="/mi-aprendizaje"
                    isDigital={isDigital}
                    title="Mi aprendizaje"
                  >
                    <span className="2xl:hidden">Aprendizaje</span>
                    <span className="hidden 2xl:inline">Mi aprendizaje</span>
                  </MainNavLink>
                )}
                <MainNavLink href="/podcast" isDigital={isDigital}>
                  <span className="inline-flex items-center gap-1 xl:gap-1.5">
                    <FiRadio size={13} className="opacity-80 shrink-0" />
                    Podcast
                  </span>
                </MainNavLink>
                <MainNavLink
                  href="/soluciones-digitales"
                  isDigital={isDigital}
                  emphasized={isDigital}
                  title="Soluciones informáticas"
                >
                  <span className="inline-flex items-center gap-1 xl:gap-1.5">
                    <FiCpu size={13} className="opacity-80 shrink-0" />
                    <span className="2xl:hidden">Soluciones inf.</span>
                    <span className="hidden 2xl:inline">
                      Soluciones informáticas
                    </span>
                  </span>
                </MainNavLink>
              </nav>

              <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
                {mounted && (
                  <div className="md:hidden">
                    <LiveBadge />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(!searchOpen);
                    setMobileOpen(false);
                  }}
                  className={cn(
                    "p-2 transition-colors rounded-lg",
                    isDigital
                      ? "text-zinc-400 hover:text-emerald-400 hover:bg-white/10"
                      : "text-warm-gray/80 hover:text-primary hover:bg-primary-light/15"
                  )}
                  aria-label="Buscar"
                >
                  <FiSearch size={18} />
                </button>

                <Link
                  href="/carrito"
                  className={cn(
                    "relative p-2 transition-colors rounded-lg",
                    isDigital
                      ? "text-zinc-400 hover:text-emerald-400 hover:bg-white/10"
                      : "text-warm-gray/80 hover:text-primary hover:bg-primary-light/15"
                  )}
                  aria-label="Carrito"
                >
                  <FiShoppingBag size={18} />
                  {itemCount > 0 && (
                    <span
                      className={cn(
                        "absolute -top-0.5 -right-0.5 text-white text-[10px] w-[17px] h-[17px] rounded-full flex items-center justify-center font-bold",
                        isDigital
                          ? "bg-gradient-to-br from-emerald-500 to-cyan-500"
                          : "bg-primary"
                      )}
                    >
                      {itemCount}
                    </span>
                  )}
                </Link>

                {session ? (
                  <div className="hidden lg:flex items-center gap-1 pl-1">
                    {session.user.role === "ADMIN" && (
                      <Link
                        href="/admin"
                        className={cn(
                          "text-[11px] font-semibold px-2.5 py-1.5 rounded-full transition-colors",
                          isDigital
                            ? "text-cyan-200 bg-cyan-500/15 hover:bg-cyan-500/25"
                            : "text-secondary-dark bg-secondary-light/50 hover:bg-secondary-light/70"
                        )}
                      >
                        Admin
                      </Link>
                    )}
                    <Link
                      href="/perfil"
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        isDigital
                          ? "text-zinc-400 hover:text-emerald-400 hover:bg-white/10"
                          : "text-warm-gray/80 hover:text-primary hover:bg-primary-light/15"
                      )}
                      aria-label="Mi cuenta"
                    >
                      <FiUser size={18} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className={cn(
                        "text-[11px] px-2 py-1.5 transition-colors",
                        isDigital
                          ? "text-zinc-500 hover:text-emerald-400"
                          : "text-gray-400 hover:text-primary"
                      )}
                    >
                      Salir
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className={cn(
                      "hidden lg:inline-flex text-[13px] font-semibold px-4 py-2 rounded-full transition-all",
                      isDigital
                        ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-zinc-950 hover:opacity-95 shadow-[0_0_20px_-6px_rgba(52,211,153,0.5)]"
                        : "bg-primary text-white hover:bg-primary-dark"
                    )}
                  >
                    Ingresar
                  </Link>
                )}

                <button
                  type="button"
                  className={cn(
                    "lg:hidden p-2 rounded-lg transition-colors",
                    isDigital
                      ? "text-zinc-300 hover:text-emerald-400 hover:bg-white/10"
                      : "text-warm-gray hover:text-primary hover:bg-primary-light/15"
                  )}
                  onClick={() => {
                    setMobileOpen(!mobileOpen);
                    setSearchOpen(false);
                  }}
                  aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
                >
                  {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={cn(
                  "overflow-hidden border-t",
                  isDigital
                    ? "border-white/10 bg-zinc-900/95"
                    : "border-primary-light/20 bg-white"
                )}
              >
                <form
                  onSubmit={handleSearch}
                  className="mx-auto max-w-2xl px-4 py-3"
                >
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-full px-4 py-2",
                      isDigital
                        ? "bg-zinc-800/80 ring-1 ring-white/10"
                        : "bg-soft-gray"
                    )}
                  >
                    <FiSearch
                      size={18}
                      className={cn(
                        "shrink-0",
                        isDigital ? "text-zinc-500" : "text-gray-400"
                      )}
                    />
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar productos..."
                      className={cn(
                        "flex-1 bg-transparent text-sm outline-none min-w-0",
                        isDigital
                          ? "text-zinc-100 placeholder:text-zinc-500"
                          : "placeholder:text-gray-400"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setSearchOpen(false)}
                      className={cn(
                        "shrink-0 p-1",
                        isDigital
                          ? "text-zinc-500 hover:text-zinc-300"
                          : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* —— Barra de categorías (dinámica) —— */}
        <div
          className={cn(
            "border-t rounded-b-2xl overflow-visible",
            isDigital
              ? "bg-gradient-to-r from-zinc-900/95 via-zinc-800/90 to-zinc-900/95 border-white/10"
              : "bg-gradient-to-r from-primary-light/95 via-primary-light/85 to-secondary-light/70 border-white/30"
          )}
        >
          <div className="mx-auto max-w-7xl overflow-visible">
            {/* Desktop + tablet: varias filas centradas si no caben en una línea */}
            <div className="hidden md:flex flex-wrap justify-center items-stretch px-2 sm:px-4 py-1 gap-y-0">
              <Link
                href="/productos"
                className={cn(
                  "shrink-0 px-4 py-3 text-[11px] sm:text-xs font-bold tracking-[0.12em] uppercase transition-colors border-r",
                  isDigital
                    ? "text-zinc-300 border-white/10 hover:bg-white/10"
                    : "text-warm-gray/90 border-white/20 hover:bg-white/25"
                )}
              >
                Todos
              </Link>
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={cn(
                    "relative shrink-0 border-r last:border-r-0",
                    isDigital ? "border-white/10" : "border-white/20"
                  )}
                  onMouseEnter={(e) => handleCatEnter(cat, e.currentTarget)}
                  onMouseLeave={handleCatLeave}
                >
                  <Link
                    href={`/productos?categoria=${cat.slug}`}
                    className={cn(
                      "flex items-center gap-1 px-4 py-3 text-[11px] sm:text-xs font-bold tracking-[0.12em] uppercase transition-colors h-full",
                      isDigital
                        ? "text-zinc-200 hover:bg-white/10"
                        : "text-warm-gray hover:bg-white/25",
                      openMenu?.catId === cat.id &&
                        (isDigital ? "bg-white/10" : "bg-white/20")
                    )}
                  >
                    {cat.name}
                    {cat.children.length > 0 && (
                      <FiChevronDown
                        size={12}
                        className={`opacity-70 transition-transform ${openMenu?.catId === cat.id ? "rotate-180" : ""}`}
                      />
                    )}
                  </Link>
                </div>
              ))}
            </div>

            {/* Mobile: mismas filas centradas (sin recorte lateral) */}
            <div className="flex md:hidden flex-wrap justify-center items-stretch px-2 py-1 gap-y-0">
              <Link
                href="/productos"
                className={cn(
                  "shrink-0 px-3 py-2.5 text-[10px] font-bold tracking-[0.1em] uppercase whitespace-nowrap border-r last:border-r-0",
                  isDigital
                    ? "text-zinc-300 border-white/10"
                    : "text-warm-gray/90 border-white/25"
                )}
              >
                Todos
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/productos?categoria=${cat.slug}`}
                  className={cn(
                    "shrink-0 px-3 py-2.5 text-[10px] font-bold tracking-[0.1em] uppercase whitespace-nowrap border-r last:border-r-0",
                    isDigital
                      ? "text-zinc-200 border-white/10"
                      : "text-warm-gray border-white/25"
                  )}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {mounted &&
        openMenu &&
        createPortal(
          <div
            role="menu"
            className={cn(
              "fixed z-[100] min-w-[200px] rounded-b-xl shadow-xl py-1.5 pt-2 -mt-1 border",
              isDigital
                ? "bg-zinc-900 border-white/15 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)]"
                : "bg-white border-primary-light/30"
            )}
            style={{ top: openMenu.top, left: openMenu.left }}
            onMouseEnter={cancelMenuClose}
            onMouseLeave={handleCatLeave}
          >
            {openMenu.children.map((sub) => (
              <Link
                key={sub.id}
                href={`/productos?categoria=${sub.slug}`}
                className={cn(
                  "block px-4 py-2.5 text-sm font-medium transition-colors",
                  isDigital
                    ? "text-zinc-200 hover:bg-emerald-500/15 hover:text-emerald-300"
                    : "text-warm-gray hover:bg-primary-light/15 hover:text-primary"
                )}
              >
                {sub.name}
              </Link>
            ))}
          </div>,
          document.body
        )}

      {/* Menú mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobile}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "fixed top-0 right-0 bottom-0 w-[min(100vw-3rem,320px)] z-[70] lg:hidden shadow-2xl flex flex-col border-l",
                isDigital
                  ? "bg-zinc-950 border-white/10"
                  : "bg-white border-transparent"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-between p-4 border-b",
                  isDigital ? "border-white/10" : "border-gray-100"
                )}
              >
                <Image
                  src="/img/karamba.png"
                  alt="Karamba"
                  width={100}
                  height={32}
                  className={cn(
                    "h-[28px] w-auto object-contain",
                    isDigital && "drop-shadow-[0_0_10px_rgba(52,211,153,0.12)]"
                  )}
                />
                <button
                  type="button"
                  onClick={closeMobile}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    isDigital
                      ? "text-zinc-500 hover:text-emerald-400 hover:bg-white/10"
                      : "text-gray-400 hover:text-warm-gray hover:bg-gray-50"
                  )}
                >
                  <FiX size={20} />
                </button>
              </div>

              <form
                onSubmit={handleSearch}
                className={cn(
                  "px-4 py-3 border-b",
                  isDigital ? "border-white/10" : "border-gray-100"
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2.5",
                    isDigital
                      ? "bg-zinc-900 ring-1 ring-white/10"
                      : "bg-soft-gray"
                  )}
                >
                  <FiSearch
                    size={16}
                    className={cn(
                      "shrink-0",
                      isDigital ? "text-zinc-500" : "text-gray-400"
                    )}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar..."
                    className={cn(
                      "flex-1 bg-transparent text-sm outline-none min-w-0",
                      isDigital
                        ? "text-zinc-100 placeholder:text-zinc-500"
                        : "placeholder:text-gray-400"
                    )}
                  />
                </div>
              </form>

              <div className="flex-1 overflow-y-auto py-2">
                <nav className="px-2 space-y-0.5">
                  <MobileLink href="/" label="Inicio" onClick={closeMobile} isDigital={isDigital} />
                  <MobileLink
                    href="/productos"
                    label="Productos"
                    onClick={closeMobile}
                    isDigital={isDigital}
                  />
                  <MobileLink
                    href="/productos?nuevos=1"
                    label="Nuevos"
                    onClick={closeMobile}
                    isDigital={isDigital}
                  />
                  <MobileLink
                    href="/cursos"
                    label="Cursos"
                    icon={<FiBookOpen size={15} />}
                    onClick={closeMobile}
                    isDigital={isDigital}
                  />
                  <MobileLink
                    href="/cursos-online"
                    label="Cursos online"
                    icon={<FiPlayCircle size={15} />}
                    onClick={closeMobile}
                    isDigital={isDigital}
                  />
                  {session && (
                    <MobileLink
                      href="/mi-aprendizaje"
                      label="Mi aprendizaje"
                      onClick={closeMobile}
                      isDigital={isDigital}
                    />
                  )}
                  <MobileLink
                    href="/podcast"
                    label="Podcast"
                    icon={<FiRadio size={15} />}
                    onClick={closeMobile}
                    isDigital={isDigital}
                  />
                  <MobileLink
                    href="/soluciones-digitales"
                    label="Soluciones informáticas"
                    icon={<FiCpu size={15} />}
                    onClick={closeMobile}
                    isDigital={isDigital}
                    emphasized={isDigital}
                  />

                  <button
                    type="button"
                    onClick={() => setMobileCatOpen(!mobileCatOpen)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-3 text-sm font-medium rounded-xl transition-colors",
                      isDigital
                        ? "text-zinc-200 hover:bg-white/10"
                        : "text-warm-gray hover:bg-primary-light/10"
                    )}
                  >
                    Categorías
                    <FiChevronDown
                      size={14}
                      className={cn(
                        "transition-transform",
                        mobileCatOpen ? "rotate-180" : "",
                        isDigital ? "text-zinc-500" : "text-gray-400"
                      )}
                    />
                  </button>
                  <AnimatePresence>
                    {mobileCatOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <Link
                          href="/productos"
                          onClick={closeMobile}
                          className={cn(
                            "block pl-6 pr-3 py-2 text-sm font-semibold rounded-xl",
                            isDigital
                              ? "text-emerald-400 hover:bg-white/10"
                              : "text-primary-dark hover:bg-primary-light/10"
                          )}
                        >
                          Ver todos los productos
                        </Link>
                        {categories.map((cat) => (
                          <div key={cat.id}>
                            <Link
                              href={`/productos?categoria=${cat.slug}`}
                              onClick={closeMobile}
                              className={cn(
                                "flex items-center gap-2 pl-6 pr-3 py-2 text-sm rounded-xl",
                                isDigital
                                  ? "text-zinc-300 hover:bg-white/10"
                                  : "text-gray-600 hover:bg-primary-light/10"
                              )}
                            >
                              <FiChevronRight
                                size={12}
                                className={isDigital ? "text-zinc-500" : "text-gray-400"}
                              />
                              {cat.name}
                            </Link>
                            {cat.children.map((sub) => (
                              <Link
                                key={sub.id}
                                href={`/productos?categoria=${sub.slug}`}
                                onClick={closeMobile}
                                className={cn(
                                  "block pl-10 pr-3 py-1.5 text-xs",
                                  isDigital
                                    ? "text-zinc-500 hover:text-emerald-400"
                                    : "text-gray-400 hover:text-primary"
                                )}
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="button"
                    onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-3 text-sm font-medium rounded-xl transition-colors",
                      isDigital
                        ? "text-zinc-200 hover:bg-white/10"
                        : "text-warm-gray hover:bg-primary-light/10"
                    )}
                  >
                    Más
                    <FiChevronDown
                      size={14}
                      className={cn(
                        "transition-transform",
                        mobileMoreOpen ? "rotate-180" : "",
                        isDigital ? "text-zinc-500" : "text-gray-400"
                      )}
                    />
                  </button>
                  <AnimatePresence>
                    {mobileMoreOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-0.5"
                      >
                        <MobileLink
                          href="/nosotros"
                          label="Nosotros"
                          onClick={closeMobile}
                          isDigital={isDigital}
                        />
                        <MobileLink
                          href="/contacto"
                          label="Contacto"
                          onClick={closeMobile}
                          isDigital={isDigital}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </nav>

                <hr
                  className={cn(
                    "my-3 mx-4",
                    isDigital ? "border-white/10" : "border-gray-100"
                  )}
                />
                <nav className="px-2 space-y-0.5">
                  <MobileLink
                    href="/faq"
                    label="Preguntas frecuentes"
                    onClick={closeMobile}
                    small
                    isDigital={isDigital}
                  />
                  <MobileLink
                    href="/politicas-envio"
                    label="Política de envíos"
                    onClick={closeMobile}
                    small
                    isDigital={isDigital}
                  />
                  <MobileLink
                    href="/politicas-cambio"
                    label="Política de cambios"
                    onClick={closeMobile}
                    small
                    isDigital={isDigital}
                  />
                </nav>
              </div>

              <div
                className={cn(
                  "p-4 border-t space-y-2",
                  isDigital ? "border-white/10" : "border-gray-100"
                )}
              >
                {session ? (
                  <>
                    <div className="flex items-center gap-3 px-1 mb-2">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          isDigital
                            ? "bg-emerald-500/15"
                            : "bg-primary-light/30"
                        )}
                      >
                        <FiUser
                          size={14}
                          className={isDigital ? "text-emerald-400" : "text-primary-dark"}
                        />
                      </div>
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium truncate",
                            isDigital ? "text-zinc-200" : "text-warm-gray"
                          )}
                        >
                          {session.user.name || session.user.email}
                        </p>
                        <p
                          className={cn(
                            "text-[10px] truncate",
                            isDigital ? "text-zinc-500" : "text-gray-400"
                          )}
                        >
                          {session.user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href="/perfil"
                        onClick={closeMobile}
                        className={cn(
                          "flex-1 text-center text-sm font-medium py-2.5 rounded-xl transition-colors",
                          isDigital
                            ? "text-zinc-200 bg-zinc-800/80 hover:bg-zinc-800"
                            : "text-warm-gray bg-soft-gray hover:bg-gray-200"
                        )}
                      >
                        Mi cuenta
                      </Link>
                      {session.user.role === "ADMIN" && (
                        <Link
                          href="/admin"
                          onClick={closeMobile}
                          className={cn(
                            "flex-1 text-center text-sm font-semibold py-2.5 rounded-xl",
                            isDigital
                              ? "text-cyan-200 bg-cyan-500/15"
                              : "text-secondary-dark bg-secondary-light/40"
                          )}
                        >
                          Admin
                        </Link>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        signOut();
                        closeMobile();
                      }}
                      className={cn(
                        "w-full text-center text-sm py-2 transition-colors",
                        isDigital
                          ? "text-zinc-500 hover:text-emerald-400"
                          : "text-gray-400 hover:text-primary"
                      )}
                    >
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={closeMobile}
                    className={cn(
                      "block text-center text-sm font-semibold py-3 rounded-xl transition-all",
                      isDigital
                        ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-zinc-950 hover:opacity-95"
                        : "bg-primary text-white hover:bg-primary-dark"
                    )}
                  >
                    Ingresar
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function MainNavLink({
  href,
  children,
  isDigital,
  emphasized,
  title,
}: {
  href: string;
  children: React.ReactNode;
  isDigital?: boolean;
  emphasized?: boolean;
  title?: string;
}) {
  return (
    <Link
      href={href}
      title={title}
      className={cn(
        "shrink-0 whitespace-nowrap text-[11px] xl:text-[13px] font-medium px-1.5 xl:px-2.5 py-1.5 xl:py-2 rounded-lg transition-colors",
        isDigital
          ? emphasized
            ? "text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20 hover:bg-emerald-500/15"
            : "text-zinc-300 hover:text-emerald-400 hover:bg-white/5"
          : "text-warm-gray/85 hover:text-primary hover:bg-primary-light/10"
      )}
    >
      {children}
    </Link>
  );
}

function MobileLink({
  href,
  label,
  icon,
  onClick,
  small,
  isDigital,
  emphasized,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  small?: boolean;
  isDigital?: boolean;
  emphasized?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-3 rounded-xl transition-colors",
        small
          ? isDigital
            ? "py-2 text-xs text-zinc-500 hover:text-emerald-400"
            : "py-2 text-xs text-gray-400 hover:text-gray-600"
          : isDigital
            ? emphasized
              ? "py-3 text-sm font-medium text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20"
              : "py-3 text-sm font-medium text-zinc-200 hover:bg-white/10"
            : "py-3 text-sm font-medium text-warm-gray hover:bg-primary-light/10"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
