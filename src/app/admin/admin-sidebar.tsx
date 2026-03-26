"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiGrid,
  FiBox,
  FiShoppingCart,
  FiUsers,
  FiSettings,
  FiCreditCard,
  FiImage,
  FiFolder,
  FiBookOpen,
  FiMonitor,
  FiMenu,
  FiX,
  FiHome,
  FiDollarSign,
  FiTag,
  FiMessageSquare,
} from "react-icons/fi";

const mainLinks = [
  { href: "/admin", label: "Dashboard", icon: FiGrid },
  { href: "/admin/productos", label: "Productos", icon: FiBox },
  { href: "/admin/categorias", label: "Categorías", icon: FiFolder },
  { href: "/admin/cursos", label: "Cursos", icon: FiBookOpen },
  { href: "/admin/cursos-online", label: "Cursos online", icon: FiMonitor },
  { href: "/admin/banners", label: "Banners", icon: FiImage },
  { href: "/admin/cupones", label: "Cupones", icon: FiTag },
  { href: "/admin/modales", label: "Modales del sitio", icon: FiMessageSquare },
];

const salesLinks = [
  { href: "/admin/ordenes", label: "Órdenes", icon: FiShoppingCart },
  { href: "/admin/usuarios", label: "Usuarios", icon: FiUsers },
];

const payLinks = [
  { href: "/admin/cuentas-pago", label: "Cuentas de pago", icon: FiDollarSign },
  { href: "/admin/pagos", label: "Mercado Pago", icon: FiCreditCard },
];

const configLinks = [
  { href: "/admin/configuracion", label: "Configuración", icon: FiSettings },
];

function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  if (pathname === href) return true;
  if (href === "/admin/cursos") {
    return (
      pathname.startsWith("/admin/cursos") &&
      !pathname.startsWith("/admin/cursos-online")
    );
  }
  return pathname.startsWith(`${href}/`);
}

function NavSection({
  title,
  links,
  pathname,
  onNavigate,
}: {
  title: string;
  links: { href: string; label: string; icon: typeof FiGrid }[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="mb-5">
      <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
        {title}
      </p>
      <nav className="space-y-0.5">
        {links.map((link) => {
          const isActive = isAdminNavActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-primary-light/50 to-secondary-light/35 text-primary-dark font-semibold shadow-sm border border-primary-light/25"
                  : "text-gray-600 hover:text-warm-gray hover:bg-white/70 border border-transparent"
              )}
            >
              <span
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  isActive
                    ? "bg-white/80 text-primary-dark"
                    : "bg-white/40 text-gray-500"
                )}
              >
                <link.icon size={16} />
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  const panel = (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-4 border-b border-primary-light/20">
        <Link
          href="/"
          onClick={closeMobile}
          className="flex items-center gap-2 text-xs font-semibold text-primary-dark/80 hover:text-primary-dark transition-colors mb-4"
        >
          <FiHome size={14} />
          Volver al sitio
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/80 border border-primary-light/30 p-2 shadow-sm">
            <Image
              src="/no-image.png"
              alt="Karamba"
              width={100}
              height={32}
              className="h-8 w-auto object-contain"
            />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Backoffice
            </p>
            <p className="text-sm font-extrabold text-warm-gray leading-tight">
              Karamba
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavSection
          title="General"
          links={mainLinks}
          pathname={pathname}
          onNavigate={closeMobile}
        />
        <NavSection
          title="Ventas"
          links={salesLinks}
          pathname={pathname}
          onNavigate={closeMobile}
        />
        <NavSection
          title="Pagos"
          links={payLinks}
          pathname={pathname}
          onNavigate={closeMobile}
        />
        <NavSection
          title="Sistema"
          links={configLinks}
          pathname={pathname}
          onNavigate={closeMobile}
        />
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex w-60 shrink-0 flex-col min-h-[calc(100vh-0px)] border-r border-primary-light/25 bg-gradient-to-b from-[#fff7fb] via-cream/80 to-secondary-light/25">
        {panel}
      </aside>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-4 left-4 z-50 w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg flex items-center justify-center hover:opacity-95 transition-opacity border border-white/20"
        aria-label="Menú admin"
      >
        <FiMenu size={20} />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-hidden
              onClick={closeMobile}
              className="fixed inset-0 bg-warm-gray/25 backdrop-blur-[2px] z-[80] md:hidden cursor-pointer"
            />
            <motion.aside
              initial={{ x: "-105%" }}
              animate={{ x: 0 }}
              exit={{ x: "-105%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed top-0 left-0 bottom-0 w-[min(100vw-2.5rem,288px)] z-[90] md:hidden shadow-2xl border-r border-primary-light/30 bg-gradient-to-b from-[#fff7fb] via-cream to-secondary-light/30 flex flex-col rounded-r-3xl overflow-hidden"
            >
              <div className="flex justify-end p-2 border-b border-primary-light/15 bg-white/30">
                <button
                  type="button"
                  onClick={closeMobile}
                  className="p-2 rounded-xl text-gray-500 hover:bg-white/80 transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{panel}</div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
