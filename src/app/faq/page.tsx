"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown } from "react-icons/fi";

const faqs = [
  {
    q: "¿Tienen local?",
    a: "¡Sí! Ahora contamos con un taller/local físico en la zona de Buceo, ubicado en Solferino 4041, Montevideo.\nPodés acercarte a retirar tus pedidos o coordinar una visita, pero te recomendamos consultar antes, ya que no contamos con stock permanente de todos los artículos.\nTrabajamos con muchas piezas personalizadas y de producción a pedido, por lo que cada visita es una experiencia más cercana y creativa.",
  },
  {
    q: "¿Cómo hago para realizar un pedido?",
    a: 'Para realizar un pedido por la web primero debes agregar los productos que quieras al carrito de compras, ajustar las cantidades, y detalle del producto y cuando hayas terminado das click en el botón "finalizar compra" y seguir los pasos para realizar el pago y coordinar la entrega con nosotros vía WhatsApp.\nEl sistema te irá guiando para finalizar la compra con éxito.',
  },
  {
    q: "¿Qué medios de pago tienen?",
    a: "Aceptamos transferencia y depósitos en ITAU, Mi Dinero, Scotiabank y BROU, además de giro en redes de cobranza. También pagos en cuotas con tarjeta de crédito a través de Mercado Pago. En la web, si pagás con depósito o transferencia, tenés un 12% de descuento sobre el total del pedido; con Mercado Pago el total corresponde al precio de lista sin ese descuento.",
  },
  {
    q: "¿Realizan envíos?",
    a: "Sí, enviamos a todo el país por DAC.\nDentro de Montevideo enviamos a través de cadetería privada la cual tiene un costo de $250.",
  },
  {
    q: "¿Cuál es el precio del envío?",
    a: "Para Montevideo, el precio del envío es de $250 y se coordina con 24hs de anticipación.\nTambién podés pasar a retirar sin costo por nuestro Pick-up en la zona de Buceo.\nPara el interior, el precio varía según el peso del producto ya que se envía por DAC.",
  },
  {
    q: "¿Cuánto demoran los envíos?",
    a: "Los artículos de fabricación propia se realizan a pedido, con un tiempo estimado de hasta 5 días hábiles.\nLos personalizados requieren entre 10 a 15 días hábiles.\nOtros productos: entrega dentro de 24 hs hábiles si hay stock.",
  },
  {
    q: "¿Qué hago si tengo preguntas?",
    a: "Podés comunicarte por WhatsApp: 097 629 629.",
  },
  {
    q: "¿Dónde retiro el pedido?",
    a: "En zona Buceo (Montevideo), previa coordinación.",
  },
  {
    q: "¿Qué pasa si el producto llega mal?",
    a: "Karamba no se responsabiliza una vez entregado al servicio de cadetería, pero se evaluará cada caso para encontrar solución.",
  },
  {
    q: "¿Los productos cuentan con garantía?",
    a: "Sí, 15 días para productos de fabricación propia.",
  },
  {
    q: "¿Puedo cambiar un producto?",
    a: "Sí, solo productos NO personalizados, dentro de 10 días, en mismas condiciones.\nNo hay cambios por mal uso.",
  },
  {
    q: "¿Puedo pedir devolución de dinero?",
    a: "No. Solo cambios o vale de compra.",
  },
  {
    q: "¿Cómo pedir productos personalizados?",
    a: "Se coordina por WhatsApp con:\n\n• Temática\n• Nombre / edad\n• Fecha\n• Estilo\n\nIncluye muestra digital previa.\nNo se aceptan cambios luego de aprobado.",
  },
  {
    q: "¿Cómo cuidar herramientas 3D?",
    a: "Evitar altas temperaturas. Son resistentes, lavables.",
  },
  {
    q: "¿Cómo cuidar moldes MDF?",
    a: "Evitar humedad. Limpiar con paño húmedo.",
  },
];

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="border-b border-primary-light/30 last:border-0"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="font-semibold text-warm-gray group-hover:text-primary transition-colors pr-4 text-[15px]">
          {q}
        </span>
        <FiChevronDown
          size={18}
          className={`text-gray-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180 text-primary" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-5 text-gray-600 text-sm leading-relaxed whitespace-pre-line">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <span className="text-primary font-semibold text-sm uppercase tracking-wider">
          Ayuda
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-warm-gray">
          Preguntas Frecuentes
        </h1>
        <p className="mt-3 text-gray-500">
          Todo lo que necesitás saber sobre Karamba
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-primary-light/30 shadow-sm px-6 sm:px-8"
      >
        {faqs.map((faq, i) => (
          <FaqItem key={i} q={faq.q} a={faq.a} index={i} />
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-10 text-center"
      >
        <p className="text-gray-500 text-sm">
          ¿No encontrás tu respuesta?
        </p>
        <a
          href="https://wa.me/59897629629"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex mt-3 bg-green-500 text-white font-semibold px-6 py-3 rounded-full hover:bg-green-600 transition-all shadow-md text-sm"
        >
          Escribinos por WhatsApp
        </a>
      </motion.div>
    </div>
  );
}
