"use client";

import { motion } from "framer-motion";
import { FiHeart, FiStar, FiPackage, FiSmile } from "react-icons/fi";

const features = [
  {
    icon: FiHeart,
    title: "Hecho con Amor",
    description:
      "Cada producto es creado a mano con dedicación y pasión, cuidando cada detalle.",
    iconBg: "bg-primary-light/40",
    iconColor: "text-primary-dark",
    borderHover: "hover:border-primary-light/50",
  },
  {
    icon: FiStar,
    title: "Calidad Premium",
    description:
      "Materiales seleccionados para productos que duren y que te encanten.",
    iconBg: "bg-accent-light/60",
    iconColor: "text-accent-dark",
    borderHover: "hover:border-accent-light/60",
  },
  {
    icon: FiPackage,
    title: "Envío Seguro",
    description:
      "Empacamos con cariño y enviamos a todo Uruguay para que llegue perfecto.",
    iconBg: "bg-mint/50",
    iconColor: "text-green-700",
    borderHover: "hover:border-mint/60",
  },
  {
    icon: FiSmile,
    title: "Atención Personal",
    description:
      "Te acompañamos en cada paso. Consultas, pedidos especiales, lo que necesites.",
    iconBg: "bg-secondary-light/50",
    iconColor: "text-secondary-dark",
    borderHover: "hover:border-secondary-light/60",
  },
];

export default function BrandSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-accent-dark font-semibold text-sm uppercase tracking-wider">
            ¿Por qué elegirnos?
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-warm-gray">
            Lo que nos hace diferentes
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`text-center p-7 rounded-2xl bg-white hover:shadow-xl transition-all duration-300 border border-transparent ${feature.borderHover}`}
            >
              <div
                className={`mx-auto w-14 h-14 rounded-2xl ${feature.iconBg} ${feature.iconColor} flex items-center justify-center mb-5`}
              >
                <feature.icon size={24} />
              </div>
              <h3 className="text-base font-bold text-warm-gray mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
