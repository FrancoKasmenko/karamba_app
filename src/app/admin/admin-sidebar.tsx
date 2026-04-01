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
  FiActivity,
  FiTruck,
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
  { href: "/admin/analytics", label: "Analítica", icon: FiActivity },
  { href: "/admin/usuarios", label: "Usuarios", icon: FiUsers },
];

const payLinks = [
  { href: "/admin/cuentas-pago", label: "Cuentas de pago", icon: FiDollarSign },
  { href: "/admin/pagos", label: "Pagos (MP / PayPal)", icon: FiCreditCard },
  { href: "/admin/envio-zonas", label: "Zonas de envío", icon: FiTruck },
];

const configLinks = [
  { href: "/admin/configuracion", label: "Configuración", icon: FiSettings },
];

const allNavLinks = [
  ...mainLinks,
  ...salesLinks,
  ...payLinks,
  ...configLinks,
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

function mobileNavTitle(pathname: string): string {
  const hit = allNavLinks.find((l) => isAdminNavActive(pathname, l.href));
  return hit?.label ?? "Administración";
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
                "flex items-center gap-3 px-3 py-3 sm:py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 min-h-[44px] sm:min-h-0 touch-manipulation",
                isActive
                  ? "bg-gradient-to-r from-primary-light/50 to-secondary-light/35 text-primary-dark font-semibold shadow-sm border border-primary-light/25"
                  : "text-gray-600 hover:text-warm-gray hover:bg-white/70 border border-transparent active:bg-white/90"
              )}
            >
              <span
                className={cn(
                  "w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
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

export default function AdminSidebar({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  const panel = (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-5 pb-4 border-b border-primary-light/20 shrink-0">
        <Link
          href="/"
          onClick={closeMobile}
          className="inline-flex items-center gap-2 text-xs font-semibold text-primary-dark/80 hover:text-primary-dark transition-colors mb-4 min-h-[44px] sm:min-h-0 py-1 touch-manipulation"
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

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
    <div className="flex flex-col md:flex-row w-full min-h-[calc(100vh-5.5rem)] md:min-h-[calc(100vh-4.5rem)] bg-cream/50">
      <aside className="hidden md:flex w-[min(100%,15rem)] lg:w-60 shrink-0 flex-col min-h-0 md:min-h-[calc(100vh-4.5rem)] border-r border-primary-light/25 bg-gradient-to-b from-[#fff7fb] via-cream/80 to-secondary-light/25">
        {panel}
      </aside>

      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        <header className="md:hidden shrink-0 sticky top-0 z-40 flex items-center gap-2 border-b border-primary-light/25 bg-cream/95 backdrop-blur-md px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-warm-gray hover:bg-white/80 active:bg-white border border-transparent touch-manipulation"
            aria-label="Abrir menú de administración"
          >
            <FiMenu size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 leading-none">
              Karamba
            </p>
            <p className="text-sm font-extrabold text-warm-gray truncate leading-tight">
              {mobileNavTitle(pathname)}
            </p>
          </div>
          <Link
            href="/"
            className="flex h-11 items-center shrink-0 rounded-xl px-3 text-xs font-semibold text-primary-dark hover:bg-white/80 active:bg-white touch-manipulation"
          >
            Sitio
          </Link>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 py-4 sm:px-5 sm:py-6 lg:px-10 lg:py-10 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-hidden
              onClick={closeMobile}
              className="fixed inset-0 bg-warm-gray/40 backdrop-blur-[2px] z-[80] md:hidden cursor-pointer"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed top-0 left-0 bottom-0 w-[min(100vw-3rem,20.5rem)] max-w-[100vw] z-[90] md:hidden shadow-2xl border-r border-primary-light/30 bg-gradient-to-b from-[#fff7fb] via-cream to-secondary-light/30 flex flex-col pt-[env(safe-area-inset-top)]"
            >
              <div className="flex justify-between items-center gap-2 px-2 py-2 border-b border-primary-light/15 bg-white/30 shrink-0">
                <p className="text-xs font-bold text-warm-gray pl-2">Menú</p>
                <button
                  type="button"
                  onClick={closeMobile}
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 hover:bg-white/80 touch-manipulation"
                  aria-label="Cerrar menú"
                >
                  <FiX size={22} />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain">
                {panel}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
