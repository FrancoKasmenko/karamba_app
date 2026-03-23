"use client";

import { motion } from "framer-motion";
import { FiTruck, FiPackage, FiMapPin, FiClock, FiMessageCircle, FiCheckCircle, FiAlertCircle, FiHeart } from "react-icons/fi";

const sections = [
  {
    icon: FiTruck,
    title: "Envíos",
    items: [
      "Realizamos envíos a todo Uruguay a través de DAC.",
      "Envíos dentro de Montevideo: $250 (cadetería privada).",
      "Si tu pedido es por DAC, te avisaremos cuando esté despachado y te enviaremos el comprobante de seguimiento.",
      "Si es dentro de Montevideo, coordinaremos previamente la entrega para asegurarnos de que estés disponible.",
    ],
  },
  {
    icon: FiMapPin,
    title: "Nuestro taller",
    items: [
      "Nos encontramos en la zona de Buceo, Montevideo.",
      "No funcionamos como tienda tradicional con productos en exhibición.",
      "Si elegiste retiro en el local, te avisaremos cuando tu pedido esté listo para coordinar la entrega.",
      "Recordá esperar siempre nuestra confirmación antes de venir a retirar.",
    ],
  },
  {
    icon: FiClock,
    title: "Disponibilidad y plazos",
    items: [
      "No contamos con stock permanente de productos de fabricación propia; se realizan a pedido.",
      "Algunos productos pueden estar disponibles para entrega inmediata.",
      "Otros requieren un plazo de producción de aproximadamente 7 días hábiles, dependiendo de la cantidad de trabajos en curso.",
    ],
  },
  {
    icon: FiCheckCircle,
    title: "Después de tu compra",
    items: [
      "Si no recibís un mensaje nuestro dentro de las 24 hs, escribinos por WhatsApp con tu nombre, número de orden y comprobante de pago.",
    ],
  },
];

export default function PurchaseInfo() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mt-14 pt-10 border-t border-primary-light/30"
    >
      <div className="mb-8 text-center">
        <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-2">
          Información importante
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-warm-gray">
          Sobre tu compra
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sections.map((section, idx) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: idx * 0.08 }}
            className="rounded-2xl bg-white border border-primary-light/25 p-5 sm:p-6"
          >
            <div className="flex items-center gap-3 mb-3.5">
              <div className="w-9 h-9 rounded-xl bg-primary-light/40 flex items-center justify-center text-primary shrink-0">
                <section.icon size={18} />
              </div>
              <h3 className="font-bold text-warm-gray text-[15px]">
                {section.title}
              </h3>
            </div>
            <ul className="space-y-2.5">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed">
                  <span className="w-1 h-1 rounded-full bg-primary/50 mt-2 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      {/* Contact & closing */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="mt-6 rounded-2xl bg-gradient-to-r from-primary-light/20 via-peach-light/20 to-lavender/20 border border-primary-light/20 p-6 sm:p-7"
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center text-primary shrink-0">
              <FiMessageCircle size={18} />
            </div>
            <div>
              <h3 className="font-bold text-warm-gray text-[15px] mb-1">
                ¿Querés visitarnos o consultar algo?
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                ¡Nos encanta recibirte! Te sugerimos escribirnos primero para confirmar disponibilidad.
                Consultas únicamente por <strong className="text-warm-gray">WhatsApp al 097 629 629</strong> (solo mensajes de texto, para poder responderte más rápido y con mayor precisión).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 flex-1">
            <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center text-primary shrink-0">
              <FiHeart size={18} />
            </div>
            <div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Al comprar en <strong className="text-warm-gray">Karamba – Tienda Creativa</strong>, estás aceptando estas condiciones de venta.
                Gracias por confiar en nuestro trabajo y apoyar un emprendimiento hecho con amor, dedicación y magia.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
}
