"use client";

import { motion } from "framer-motion";

export default function PoliticasEnvioPage() {
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
          Pol&iacute;ticas de Env&iacute;o
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
            Zonas de env&iacute;o
          </h2>
          <p>
            Realizamos env&iacute;os a <strong>todo Uruguay</strong>. En
            Montevideo ofrecemos opciones de env&iacute;o r&aacute;pido. Para el
            interior, trabajamos con agencias de encomiendas confiables.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-warm-gray mb-3">
            Tiempos de env&iacute;o
          </h2>
          <div className="bg-soft-gray rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-light/20">
                  <th className="text-left px-4 py-3 font-semibold text-warm-gray">
                    Zona
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-warm-gray">
                    Tiempo estimado
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-primary-light/20">
                  <td className="px-4 py-3">Montevideo</td>
                  <td className="px-4 py-3">24-48 hs h&aacute;biles</td>
                </tr>
                <tr className="border-t border-primary-light/20">
                  <td className="px-4 py-3">Interior (ciudades principales)</td>
                  <td className="px-4 py-3">2-4 d&iacute;as h&aacute;biles</td>
                </tr>
                <tr className="border-t border-primary-light/20">
                  <td className="px-4 py-3">Interior (otras localidades)</td>
                  <td className="px-4 py-3">3-7 d&iacute;as h&aacute;biles</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            *Los productos personalizados tienen tiempos de producci&oacute;n
            adicionales (5-10 d&iacute;as h&aacute;biles).
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-warm-gray mb-3">
            Costos de env&iacute;o
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              El costo se calcula seg&uacute;n zona, peso y tama&ntilde;o del
              paquete.
            </li>
            <li>
              Te confirmamos el costo exacto antes de finalizar la compra.
            </li>
            <li>
              Env&iacute;o gratis en compras superiores a cierto monto
              (consultanos las promociones vigentes).
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-warm-gray mb-3">
            Retiro en local
          </h2>
          <p>
            Pod&eacute;s retirar tu pedido <strong>sin costo</strong> en
            nuestro local:{" "}
            <strong>Solferino 4041, Montevideo</strong>. Coordinamos
            horario por WhatsApp.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-warm-gray mb-3">
            Seguimiento del env&iacute;o
          </h2>
          <p>
            Te enviamos un mensaje por WhatsApp cuando tu pedido sea
            despachado. Si enviamos por agencia, te compartimos el
            n&uacute;mero de seguimiento para que puedas rastrearlo.
          </p>
        </div>

        <div className="bg-accent-light/30 rounded-xl p-5">
          <p className="text-sm text-warm-gray">
            <strong>Importante:</strong> Los tiempos de entrega pueden variar en
            fechas especiales (D&iacute;a de la Madre, Navidad, etc.) debido a
            la alta demanda. Te recomendamos hacer tu pedido con
            anticipaci&oacute;n.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
