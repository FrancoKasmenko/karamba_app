"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
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

  const scrollHide =
    "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

  return (
    <>
      <div className="sticky top-0 z-50 mx-2 sm:mx-4 lg:mx-8 mt-2 flex flex-col rounded-2xl border border-primary-light/40 bg-white/95 shadow-sm backdrop-blur-md overflow-visible">
        {/* —— Navbar principal —— */}
        <header className="border-b border-primary-light/25">
          <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
            <div className="flex h-14 sm:h-[3.25rem] items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
                <Link href="/" className="flex items-center shrink-0">
                  <Image
                    src="/img/karamba.png"
                    alt="Karamba"
                    width={140}
                    height={45}
                    className="h-[30px] sm:h-[38px] w-auto object-contain"
                    priority
                  />
                </Link>
                {mounted && (
                  <span className="hidden md:inline-flex">
                    <LiveBadge />
                  </span>
                )}
              </div>

              {/* Desktop: navegación principal (sin categorías) */}
              <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center flex-wrap">
                <MainNavLink href="/">Inicio</MainNavLink>
                <MainNavLink href="/productos">Productos</MainNavLink>
                <MainNavLink href="/productos?nuevos=1">Nuevos</MainNavLink>
                <MainNavLink href="/cursos">
                  <span className="inline-flex items-center gap-1.5">
                    <FiBookOpen size={14} className="opacity-80" />
                    Cursos
                  </span>
                </MainNavLink>
                <MainNavLink href="/cursos-online">
                  <span className="inline-flex items-center gap-1.5">
                    <FiPlayCircle size={14} className="opacity-80" />
                    Cursos online
                  </span>
                </MainNavLink>
                {session && (
                  <MainNavLink href="/mi-aprendizaje">Mi aprendizaje</MainNavLink>
                )}
                <MainNavLink href="/podcast">
                  <span className="inline-flex items-center gap-1.5">
                    <FiRadio size={14} className="opacity-80" />
                    Podcast
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
                  className="p-2 text-warm-gray/80 hover:text-primary transition-colors rounded-lg hover:bg-primary-light/15"
                  aria-label="Buscar"
                >
                  <FiSearch size={18} />
                </button>

                <Link
                  href="/carrito"
                  className="relative p-2 text-warm-gray/80 hover:text-primary transition-colors rounded-lg hover:bg-primary-light/15"
                  aria-label="Carrito"
                >
                  <FiShoppingBag size={18} />
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] w-[17px] h-[17px] rounded-full flex items-center justify-center font-bold">
                      {itemCount}
                    </span>
                  )}
                </Link>

                {session ? (
                  <div className="hidden lg:flex items-center gap-1 pl-1">
                    {session.user.role === "ADMIN" && (
                      <Link
                        href="/admin"
                        className="text-[11px] font-semibold text-secondary-dark bg-secondary-light/50 px-2.5 py-1.5 rounded-full hover:bg-secondary-light/70 transition-colors"
                      >
                        Admin
                      </Link>
                    )}
                    <Link
                      href="/perfil"
                      className="p-2 text-warm-gray/80 hover:text-primary rounded-lg hover:bg-primary-light/15 transition-colors"
                      aria-label="Mi cuenta"
                    >
                      <FiUser size={18} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="text-[11px] text-gray-400 hover:text-primary px-2 py-1.5 transition-colors"
                    >
                      Salir
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="hidden lg:inline-flex text-[13px] font-semibold bg-primary text-white px-4 py-2 rounded-full hover:bg-primary-dark transition-all"
                  >
                    Ingresar
                  </Link>
                )}

                <button
                  type="button"
                  className="lg:hidden p-2 text-warm-gray hover:text-primary rounded-lg hover:bg-primary-light/15"
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
                className="overflow-hidden border-t border-primary-light/20 bg-white"
              >
                <form
                  onSubmit={handleSearch}
                  className="mx-auto max-w-2xl px-4 py-3"
                >
                  <div className="flex items-center gap-3 bg-soft-gray rounded-full px-4 py-2">
                    <FiSearch size={18} className="text-gray-400 shrink-0" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar productos..."
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 min-w-0"
                    />
                    <button
                      type="button"
                      onClick={() => setSearchOpen(false)}
                      className="text-gray-400 hover:text-gray-600 shrink-0 p-1"
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
        <div className="bg-gradient-to-r from-primary-light/95 via-primary-light/85 to-secondary-light/70 border-t border-white/30 rounded-b-2xl overflow-visible">
          <div className="mx-auto max-w-7xl overflow-visible">
            {/* Desktop + tablet: hover dropdowns — sin overflow-x-auto en el padre: recorta el eje Y y oculta el menú */}
            <div
              className={`hidden md:flex items-stretch overflow-x-auto ${scrollHide} px-2 sm:px-4`}
            >
              <Link
                href="/productos"
                className="shrink-0 px-4 py-3 text-[11px] sm:text-xs font-bold tracking-[0.12em] text-warm-gray/90 uppercase hover:bg-white/25 transition-colors border-r border-white/20"
              >
                Todos
              </Link>
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="relative shrink-0 border-r border-white/20 last:border-r-0"
                  onMouseEnter={(e) => handleCatEnter(cat, e.currentTarget)}
                  onMouseLeave={handleCatLeave}
                >
                  <Link
                    href={`/productos?categoria=${cat.slug}`}
                    className={`flex items-center gap-1 px-4 py-3 text-[11px] sm:text-xs font-bold tracking-[0.12em] text-warm-gray uppercase hover:bg-white/25 transition-colors h-full ${
                      openMenu?.catId === cat.id ? "bg-white/20" : ""
                    }`}
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

            {/* Mobile: scroll horizontal */}
            <div
              className={`flex md:hidden items-stretch overflow-x-auto ${scrollHide} px-2`}
            >
              <Link
                href="/productos"
                className="shrink-0 px-3 py-2.5 text-[10px] font-bold tracking-[0.1em] text-warm-gray/90 uppercase whitespace-nowrap"
              >
                Todos
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/productos?categoria=${cat.slug}`}
                  className="shrink-0 px-3 py-2.5 text-[10px] font-bold tracking-[0.1em] text-warm-gray uppercase whitespace-nowrap border-l border-white/25"
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
            className="fixed z-[100] min-w-[200px] bg-white rounded-b-xl shadow-xl border border-primary-light/30 py-1.5 pt-2 -mt-1"
            style={{ top: openMenu.top, left: openMenu.left }}
            onMouseEnter={cancelMenuClose}
            onMouseLeave={handleCatLeave}
          >
            {openMenu.children.map((sub) => (
              <Link
                key={sub.id}
                href={`/productos?categoria=${sub.slug}`}
                className="block px-4 py-2.5 text-sm font-medium text-warm-gray hover:bg-primary-light/15 hover:text-primary transition-colors"
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
              className="fixed top-0 right-0 bottom-0 w-[min(100vw-3rem,320px)] bg-white z-[70] lg:hidden shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <Image
                  src="/img/karamba.png"
                  alt="Karamba"
                  width={100}
                  height={32}
                  className="h-[28px] w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={closeMobile}
                  className="p-2 text-gray-400 hover:text-warm-gray rounded-lg hover:bg-gray-50"
                >
                  <FiX size={20} />
                </button>
              </div>

              <form onSubmit={handleSearch} className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2 bg-soft-gray rounded-xl px-3 py-2.5">
                  <FiSearch size={16} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 min-w-0"
                  />
                </div>
              </form>

              <div className="flex-1 overflow-y-auto py-2">
                <nav className="px-2 space-y-0.5">
                  <MobileLink href="/" label="Inicio" onClick={closeMobile} />
                  <MobileLink href="/productos" label="Productos" onClick={closeMobile} />
                  <MobileLink
                    href="/productos?nuevos=1"
                    label="Nuevos"
                    onClick={closeMobile}
                  />
                  <MobileLink
                    href="/cursos"
                    label="Cursos"
                    icon={<FiBookOpen size={15} />}
                    onClick={closeMobile}
                  />
                  <MobileLink
                    href="/cursos-online"
                    label="Cursos online"
                    icon={<FiPlayCircle size={15} />}
                    onClick={closeMobile}
                  />
                  {session && (
                    <MobileLink
                      href="/mi-aprendizaje"
                      label="Mi aprendizaje"
                      onClick={closeMobile}
                    />
                  )}
                  <MobileLink
                    href="/podcast"
                    label="Podcast"
                    icon={<FiRadio size={15} />}
                    onClick={closeMobile}
                  />

                  <button
                    type="button"
                    onClick={() => setMobileCatOpen(!mobileCatOpen)}
                    className="w-full flex items-center justify-between px-3 py-3 text-sm font-medium text-warm-gray hover:bg-primary-light/10 rounded-xl transition-colors"
                  >
                    Categorías
                    <FiChevronDown
                      size={14}
                      className={`text-gray-400 transition-transform ${mobileCatOpen ? "rotate-180" : ""}`}
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
                          className="block pl-6 pr-3 py-2 text-sm font-semibold text-primary-dark hover:bg-primary-light/10 rounded-xl"
                        >
                          Ver todos los productos
                        </Link>
                        {categories.map((cat) => (
                          <div key={cat.id}>
                            <Link
                              href={`/productos?categoria=${cat.slug}`}
                              onClick={closeMobile}
                              className="flex items-center gap-2 pl-6 pr-3 py-2 text-sm text-gray-600 hover:bg-primary-light/10 rounded-xl"
                            >
                              <FiChevronRight size={12} className="text-gray-400" />
                              {cat.name}
                            </Link>
                            {cat.children.map((sub) => (
                              <Link
                                key={sub.id}
                                href={`/productos?categoria=${sub.slug}`}
                                onClick={closeMobile}
                                className="block pl-10 pr-3 py-1.5 text-xs text-gray-400 hover:text-primary"
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
                    className="w-full flex items-center justify-between px-3 py-3 text-sm font-medium text-warm-gray hover:bg-primary-light/10 rounded-xl transition-colors"
                  >
                    Más
                    <FiChevronDown
                      size={14}
                      className={`text-gray-400 transition-transform ${mobileMoreOpen ? "rotate-180" : ""}`}
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
                        <MobileLink href="/nosotros" label="Nosotros" onClick={closeMobile} />
                        <MobileLink href="/contacto" label="Contacto" onClick={closeMobile} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </nav>

                <hr className="my-3 mx-4 border-gray-100" />
                <nav className="px-2 space-y-0.5">
                  <MobileLink href="/faq" label="Preguntas frecuentes" onClick={closeMobile} small />
                  <MobileLink href="/politicas-envio" label="Política de envíos" onClick={closeMobile} small />
                  <MobileLink href="/politicas-cambio" label="Política de cambios" onClick={closeMobile} small />
                </nav>
              </div>

              <div className="p-4 border-t border-gray-100 space-y-2">
                {session ? (
                  <>
                    <div className="flex items-center gap-3 px-1 mb-2">
                      <div className="w-8 h-8 bg-primary-light/30 rounded-full flex items-center justify-center">
                        <FiUser size={14} className="text-primary-dark" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-warm-gray truncate">
                          {session.user.name || session.user.email}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">{session.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href="/perfil"
                        onClick={closeMobile}
                        className="flex-1 text-center text-sm font-medium text-warm-gray bg-soft-gray py-2.5 rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        Mi cuenta
                      </Link>
                      {session.user.role === "ADMIN" && (
                        <Link
                          href="/admin"
                          onClick={closeMobile}
                          className="flex-1 text-center text-sm font-semibold text-secondary-dark bg-secondary-light/40 py-2.5 rounded-xl"
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
                      className="w-full text-center text-sm text-gray-400 hover:text-primary py-2"
                    >
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={closeMobile}
                    className="block text-center text-sm font-semibold bg-primary text-white py-3 rounded-xl hover:bg-primary-dark transition-all"
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

function MainNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-[13px] font-medium text-warm-gray/85 hover:text-primary px-3 py-2 rounded-lg transition-colors"
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
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 rounded-xl transition-colors ${
        small
          ? "py-2 text-xs text-gray-400 hover:text-gray-600"
          : "py-3 text-sm font-medium text-warm-gray hover:bg-primary-light/10"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
