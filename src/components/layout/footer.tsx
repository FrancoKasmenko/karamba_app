import Link from "next/link";
import Image from "next/image";
import { FiInstagram, FiMail, FiPhone, FiMapPin } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-primary-light/40 mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <Image
              src="/img/karamba.png"
              alt="Karamba"
              width={140}
              height={45}
              className="h-[40px] w-auto object-contain"
            />
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              Productos artesanales hechos con amor y dedicaci&oacute;n.
              Cada pieza es &uacute;nica, creada especialmente para vos.
            </p>
            <div className="flex gap-3 mt-4">
              <a
                href="https://www.instagram.com/karamba.uy/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-primary-light/40 flex items-center justify-center text-primary-dark hover:bg-primary hover:text-white transition-all"
              >
                <FiInstagram size={16} />
              </a>
              <a
                href="https://wa.me/59897629629"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-mint/60 flex items-center justify-center text-green-700 hover:bg-green-500 hover:text-white transition-all"
              >
                <FaWhatsapp size={16} />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-bold text-warm-gray mb-4 uppercase tracking-wider">
              Navegaci&oacute;n
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: "/", label: "Inicio" },
                { href: "/productos", label: "Productos" },
                { href: "/cursos", label: "Cursos" },
                { href: "/nosotros", label: "Nosotros" },
                { href: "/podcast", label: "Podcast" },
                { href: "/contacto", label: "Contacto" },
                { href: "/faq", label: "Preguntas Frecuentes" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-secondary-dark transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="text-sm font-bold text-warm-gray mb-4 uppercase tracking-wider">
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
                    className="text-sm text-gray-500 hover:text-accent-dark transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-bold text-warm-gray mb-4 uppercase tracking-wider">
              Contacto
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <FiMapPin size={15} className="text-secondary-dark mt-0.5 shrink-0" />
                <span className="text-sm text-gray-500">
                  Solferino 4041, Montevideo, Uruguay
                </span>
              </div>
              <a
                href="tel:25099128"
                className="flex items-center gap-2.5 text-sm text-gray-500 hover:text-accent-dark transition-colors"
              >
                <FiPhone size={15} className="text-accent-dark shrink-0" />
                2509 9128
              </a>
              <a
                href="https://wa.me/59897629629"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-gray-500 hover:text-green-600 transition-colors"
              >
                <FaWhatsapp size={15} className="text-green-600 shrink-0" />
                097 629 629
              </a>
              <a
                href="mailto:karamba@vera.com.uy"
                className="flex items-center gap-2.5 text-sm text-gray-500 hover:text-primary transition-colors"
              >
                <FiMail size={15} className="text-primary shrink-0" />
                karamba@vera.com.uy
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-primary-light/30 text-center">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Karamba. Todos los derechos
            reservados. Hecho con &hearts; en Uruguay.
          </p>
        </div>
      </div>
    </footer>
  );
}
