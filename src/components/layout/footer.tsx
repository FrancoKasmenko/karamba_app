"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FiInstagram, FiMail, FiPhone, FiMapPin } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { cn } from "@/lib/utils";

export default function Footer() {
  const pathname = usePathname();
  const isDigital = pathname === "/soluciones-digitales";

  return (
    <footer
      className={cn(
        "border-t",
        isDigital
          ? "mt-0 bg-zinc-950 border-white/10 text-zinc-300 pt-16"
          : "mt-16 bg-white border-primary-light/40"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <Image
              src="/img/karamba.png"
              alt="Karamba"
              width={140}
              height={45}
              className={cn(
                "h-[40px] w-auto object-contain",
                isDigital && "drop-shadow-[0_0_14px_rgba(52,211,153,0.12)]"
              )}
            />
            <p
              className={cn(
                "mt-3 text-sm leading-relaxed",
                isDigital ? "text-zinc-500" : "text-gray-500"
              )}
            >
              Productos artesanales hechos con amor y dedicaci&oacute;n.
              Cada pieza es &uacute;nica, creada especialmente para vos.
            </p>
            <div className="flex gap-3 mt-4">
              <a
                href="https://www.instagram.com/karamba.uy/"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                  isDigital
                    ? "bg-white/10 text-zinc-200 hover:bg-gradient-to-br hover:from-emerald-500 hover:to-cyan-500 hover:text-zinc-950"
                    : "bg-primary-light/40 text-primary-dark hover:bg-primary hover:text-white"
                )}
              >
                <FiInstagram size={16} />
              </a>
              <a
                href="https://wa.me/59897629629"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                  isDigital
                    ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950"
                    : "bg-mint/60 text-green-700 hover:bg-green-500 hover:text-white"
                )}
              >
                <FaWhatsapp size={16} />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4
              className={cn(
                "text-sm font-bold mb-4 uppercase tracking-wider",
                isDigital ? "text-zinc-200" : "text-warm-gray"
              )}
            >
              Navegaci&oacute;n
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: "/", label: "Inicio" },
                { href: "/productos", label: "Productos" },
                { href: "/soluciones-digitales", label: "Soluciones informáticas" },
                { href: "/cursos", label: "Cursos" },
                { href: "/nosotros", label: "Nosotros" },
                { href: "/podcast", label: "Podcast" },
                { href: "/contacto", label: "Contacto" },
                { href: "/faq", label: "Preguntas Frecuentes" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "text-sm transition-colors",
                      isDigital
                        ? link.href === "/soluciones-digitales"
                          ? "text-emerald-400 hover:text-emerald-300"
                          : "text-zinc-500 hover:text-cyan-400"
                        : "text-gray-500 hover:text-secondary-dark"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4
              className={cn(
                "text-sm font-bold mb-4 uppercase tracking-wider",
                isDigital ? "text-zinc-200" : "text-warm-gray"
              )}
            >
              Pol&iacute;ticas
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: "/politicas-cambio", label: "Pol\u00edticas de Cambio" },
                { href: "/politicas-envio", label: "Pol\u00edticas de Env\u00edo" },
                { href: "/faq", label: "Preguntas Frecuentes" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "text-sm transition-colors",
                      isDigital
                        ? "text-zinc-500 hover:text-cyan-400"
                        : "text-gray-500 hover:text-accent-dark"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4
              className={cn(
                "text-sm font-bold mb-4 uppercase tracking-wider",
                isDigital ? "text-zinc-200" : "text-warm-gray"
              )}
            >
              Contacto
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <FiMapPin
                  size={15}
                  className={cn(
                    "mt-0.5 shrink-0",
                    isDigital ? "text-cyan-400/80" : "text-secondary-dark"
                  )}
                />
                <span
                  className={cn(
                    "text-sm",
                    isDigital ? "text-zinc-500" : "text-gray-500"
                  )}
                >
                  Solferino 4041, Montevideo, Uruguay
                </span>
              </div>
              <a
                href="tel:25099128"
                className={cn(
                  "flex items-center gap-2.5 text-sm transition-colors",
                  isDigital
                    ? "text-zinc-500 hover:text-emerald-400"
                    : "text-gray-500 hover:text-accent-dark"
                )}
              >
                <FiPhone
                  size={15}
                  className={cn(
                    "shrink-0",
                    isDigital ? "text-emerald-400/90" : "text-accent-dark"
                  )}
                />
                2509 9128
              </a>
              <a
                href="https://wa.me/59897629629"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2.5 text-sm transition-colors",
                  isDigital
                    ? "text-zinc-500 hover:text-emerald-400"
                    : "text-gray-500 hover:text-green-600"
                )}
              >
                <FaWhatsapp
                  size={15}
                  className={cn(
                    "shrink-0",
                    isDigital ? "text-emerald-400" : "text-green-600"
                  )}
                />
                097 629 629
              </a>
              <a
                href="mailto:karamba@vera.com.uy"
                className={cn(
                  "flex items-center gap-2.5 text-sm transition-colors",
                  isDigital
                    ? "text-zinc-500 hover:text-cyan-400"
                    : "text-gray-500 hover:text-primary"
                )}
              >
                <FiMail
                  size={15}
                  className={cn(
                    "shrink-0",
                    isDigital ? "text-cyan-400/90" : "text-primary"
                  )}
                />
                karamba@vera.com.uy
              </a>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "mt-12 pt-6 border-t text-center",
            isDigital ? "border-white/10" : "border-primary-light/30"
          )}
        >
          <p
            className={cn(
              "text-xs",
              isDigital ? "text-zinc-600" : "text-gray-400"
            )}
          >
            &copy; {new Date().getFullYear()} Karamba. Todos los derechos
            reservados. Hecho con &hearts; en Uruguay.
          </p>
        </div>
      </div>
    </footer>
  );
}
