"use client";

import { motion } from "framer-motion";

export default function PoliticasCambioPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <span className="text-primary font-semibold text-sm uppercase tracking-wider">
          Pol&iacute;ticas
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-warm-gray">
          Pol&iacute;ticas de Cambio
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-primary-light/30 shadow-sm p-8 sm:p-10 space-y-6 text-gray-600 leading-relaxed"
      >
        <div>
          <h2 className="text-lg font-bold text-warm-gray mb-3">
            Plazo para cambios
          </h2>
          <p>
            Ten&eacute;s <strong>7 d&iacute;as corridos</strong> desde la
            recepci&oacute;n del producto para solicitar un cambio. Una vez pasado
            ese plazo, no podremos aceptar cambios.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-warm-gray mb-3">
            Condiciones del producto
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>El producto debe estar en su estado original, sin uso.</li>
            <li>
              Debe conservar su empaque y etiquetas originales.
            </li>
            <li>
              No se aceptan cambios de productos que presenten signos de uso,
              da&ntilde;o por manipulaci&oacute;n o que hayan sido alterados.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-warm-gray mb-3">
            Productos personalizados
          </h2>
          <p>
            Los productos personalizados (con nombre, color a pedido, etc.){" "}
            <strong>no tienen cambio ni devoluci&oacute;n</strong>, salvo que
            presenten un defecto de fabricaci&oacute;n. En ese caso, te lo
            reponemos sin costo.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-warm-gray mb-3">
            C&oacute;mo solicitar un cambio
          </h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Escribinos por WhatsApp al{" "}
              <strong>097 629 629</strong> o email a{" "}
              <strong>karamba@vera.com.uy</strong>.
            </li>
            <li>
              Indic&aacute; tu nombre, n&uacute;mero de pedido y el motivo
              del cambio.
            </li>
            <li>
              Te confirmaremos la disponibilidad y coordinaremos el cambio.
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-bold text-warm-gray mb-3">
            Costos de env&iacute;o del cambio
          </h2>
          <p>
            Si el cambio es por un defecto del producto, el costo de
            env&iacute;o corre por nuestra cuenta. Si el cambio es por
            preferencia del cliente (tama&ntilde;o, color, etc.), el costo de
            env&iacute;o es responsabilidad del comprador.
          </p>
        </div>

        <div className="bg-primary-light/20 rounded-xl p-5">
          <p className="text-sm text-warm-gray">
            <strong>Nota:</strong> Nos reservamos el derecho de rechazar cambios
            que no cumplan con las condiciones mencionadas. Ante cualquier duda,
            no dudes en contactarnos.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
