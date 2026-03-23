"use client";

import { motion } from "framer-motion";
import { FiHeart, FiStar, FiFeather } from "react-icons/fi";

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export default function NosotrosPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      {/* Hero */}
      <motion.div {...fade} className="text-center mb-16">
        <span className="text-primary font-semibold text-sm uppercase tracking-wider">
          Nuestra historia
        </span>
        <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold text-warm-gray leading-tight">
          Sobre Karamba
        </h1>
      </motion.div>

      {/* Story blocks */}
      <div className="space-y-10">
        <motion.div
          {...fade}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-8 sm:p-10 border border-primary-light/30 shadow-sm"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-warm-gray mb-6 tracking-wide">
            💛 HOLA, SOY MAJO
          </h2>
          <div className="space-y-4 text-gray-600 leading-relaxed text-base sm:text-lg">
            <p>
              Karamba nació desde el amor por crear para mis hijos y el deseo de
              estar presente, acompañando cada paso de su crecimiento.
            </p>
            <p>
              Empecé haciendo detalles para sus cumpleaños, buscando
              sorprenderlos y verlos felices. Sin darme cuenta, eso que hacía en
              casa empezó a crecer y a tomar forma.
            </p>
            <p>
              Con el tiempo, ese pasatiempo se transformó en un trabajo, en una
              forma de vida y en un proyecto familiar ✨
            </p>
          </div>
        </motion.div>

        <motion.div
          {...fade}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-primary-light/20 to-lavender/20 rounded-3xl p-8 sm:p-10"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-warm-gray mb-6 tracking-wide">
            ✨ DEL HOBBY AL EMPRENDIMIENTO
          </h2>
          <div className="space-y-4 text-gray-600 leading-relaxed text-base sm:text-lg">
            <p>El camino no fue lineal.</p>
            <p>
              Karamba fue cambiando, adaptándose y transformándose muchas veces.
              Pero hubo un momento que marcó un antes y un después.
            </p>
            <p>
              Durante la pandemia, lo perdimos todo. Nico se quedó sin trabajo,
              los cumpleaños desaparecieron y, con ellos, también nuestro
              ingreso.
            </p>
            <p>
              Tuvimos que vender nuestras máquinas para poder salir adelante. Fue
              empezar de cero.
            </p>
            <p>
              Pero con el tiempo, las cosas empezaron a acomodarse… y fue ahí
              donde tomamos una decisión:
            </p>
            <ul className="list-none space-y-2 pl-0 my-2">
              <li className="flex gap-2 items-start">
                <span className="shrink-0" aria-hidden>
                  💛
                </span>
                <span>volver a empezar, pero distinto</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="shrink-0" aria-hidden>
                  💛
                </span>
                <span>volver a construir, pero juntos</span>
              </li>
            </ul>
            <p>
              Así nació esta nueva etapa de Karamba, ya no como algo individual,
              sino como un verdadero proyecto en equipo.
            </p>
          </div>
        </motion.div>

        <motion.div
          {...fade}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl p-8 sm:p-10 border border-primary-light/30 shadow-sm"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-warm-gray mb-6 tracking-wide">
            ✨ LO QUE NOS MUEVE
          </h2>
          <div className="space-y-4 text-gray-600 leading-relaxed text-base sm:text-lg">
            <p>Hoy Karamba no es solo crear cosas lindas.</p>
            <p>Es brindar soluciones a otras creativas.</p>
            <p>Es acortar procesos.</p>
            <p>
              Es diseñar y fabricar nuestras propias herramientas para ayudar a
              que otras personas puedan crear y emprender.
            </p>
            <p>
              También compartimos lo que aprendimos a través de talleres y
              cursos, porque creemos que el conocimiento se comparte{" "}
            </p>
            <p>
              No buscamos la perfección, sino mejorar, aprender y seguir
              transformándonos en cada paso.
            </p>
          </div>
        </motion.div>

        <motion.div
          {...fade}
          transition={{ delay: 0.4 }}
          className="bg-accent-light/30 rounded-3xl p-8 sm:p-10"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-warm-gray mb-6 tracking-wide">
            ✨ MIRANDO EL FUTURO
          </h2>
          <div className="space-y-4 text-gray-600 leading-relaxed text-base sm:text-lg">
            <p>Karamba sigue evolucionando.</p>
            <p>
              Seguimos probando, aprendiendo y buscando nuevas formas de crear y
              sorprender.
            </p>
            <p>
              Queremos seguir acompañando a otras personas en su camino
              creativo, aportando herramientas, ideas y motivación para que se
              animen a dar ese paso.
            </p>
            <p>
              Porque si algo aprendimos, es que siempre se puede volver a empezar
              ✨
            </p>
          </div>
        </motion.div>
      </div>

      {/* Values */}
      <motion.div {...fade} transition={{ delay: 0.5 }} className="mt-16">
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-warm-gray mb-10">
          Nuestros Valores
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: FiHeart,
              title: "Pasi\u00f3n",
              desc: "Cada producto nace de la pasi\u00f3n por crear algo bello y significativo.",
              color: "bg-primary-light/40 text-primary-dark",
            },
            {
              icon: FiStar,
              title: "Calidad",
              desc: "No nos conformamos con menos. Buscamos la excelencia en cada detalle.",
              color: "bg-accent-light/60 text-accent-dark",
            },
            {
              icon: FiFeather,
              title: "Delicadeza",
              desc: "Trabajamos con cuidado y dedicaci\u00f3n, respetando cada material y proceso.",
              color: "bg-secondary-light/50 text-secondary-dark",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="text-center p-8 bg-white rounded-2xl border border-primary-light/30 shadow-sm"
            >
              <div
                className={`mx-auto w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mb-4`}
              >
                <item.icon size={24} />
              </div>
              <h3 className="text-lg font-bold text-warm-gray mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
