"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { resolveStoredProductImage, isLocalUploadPath } from "@/lib/image-url";
import { priceWithCardFee } from "@/lib/product-pricing";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  FiTruck,
  FiMapPin,
  FiUser,
  FiShoppingBag,
  FiMessageCircle,
  FiAlertCircle,
  FiCheck,
  FiChevronDown,
  FiCreditCard,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import BankLogo from "@/components/ui/bank-logo";

const DEPARTAMENTOS = [
  "Montevideo",
  "Artigas",
  "Canelones",
  "Cerro Largo",
  "Colonia",
  "Durazno",
  "Flores",
  "Florida",
  "Lavalleja",
  "Maldonado",
  "Paysandú",
  "Río Negro",
  "Rivera",
  "Rocha",
  "Salto",
  "San José",
  "Soriano",
  "Tacuarembó",
  "Treinta y Tres",
];

type DeliveryMethod = "shipping" | "pickup";

interface FormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  departamento: string;
  postalCode: string;
  notes: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  departamento?: string;
  paymentAccount?: string;
}

interface PayAccount {
  id: string;
  holderName: string;
  accountNumber: string;
  bankName: string;
  bankKey: string;
}

type PayMethod = "mercadopago" | "transfer";

const SHIPPING_COST_MVD = 250;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string) {
  return /^[\d\s\-+()]{7,15}$/.test(phone.trim());
}

export default function CheckoutPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryMethod>("shipping");
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    departamento: "Montevideo",
    postalCode: "",
    notes: "",
  });
  const [payMethod, setPayMethod] = useState<PayMethod>("mercadopago");
  const [accounts, setAccounts] = useState<PayAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [skipPhysicalDelivery, setSkipPhysicalDelivery] = useState(false);
  const [onlineCourseOnly, setOnlineCourseOnly] = useState(false);
  const [cartMetaLoading, setCartMetaLoading] = useState(true);

  const cartProductIdsKey = [...new Set(items.map((i) => i.productId))]
    .sort()
    .join(",");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetch("/api/payment-accounts")
      .then((r) => r.json())
      .then((d: PayAccount[]) => setAccounts(Array.isArray(d) ? d : []))
      .catch(() => setAccounts([]));
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      setCartMetaLoading(false);
      setSkipPhysicalDelivery(false);
      setOnlineCourseOnly(false);
      return;
    }
    let cancelled = false;
    setCartMetaLoading(true);
    fetch(
      `/api/products/checkout-meta?ids=${encodeURIComponent(cartProductIdsKey)}`
    )
      .then((r) => r.json())
      .then(
        (d: {
          onlineCourseOnly?: boolean;
          skipPhysicalDelivery?: boolean;
        }) => {
          if (cancelled) return;
          const skip =
            d.skipPhysicalDelivery !== undefined
              ? d.skipPhysicalDelivery === true
              : d.onlineCourseOnly === true;
          setSkipPhysicalDelivery(skip);
          setOnlineCourseOnly(d.onlineCourseOnly === true);
        }
      )
      .catch(() => {
        if (!cancelled) {
          setSkipPhysicalDelivery(false);
          setOnlineCourseOnly(false);
        }
      })
      .finally(() => {
        if (!cancelled) setCartMetaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cartProductIdsKey, items.length]);

  useEffect(() => {
    if (session?.user) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || session.user.name || "",
        email: prev.email || session.user.email || "",
      }));
    }
  }, [session]);

  const isMontevideo = form.departamento === "Montevideo";
  const shippingCost = skipPhysicalDelivery
    ? 0
    : delivery === "pickup"
      ? 0
      : isMontevideo
        ? SHIPPING_COST_MVD
        : 0;
  const showShippingTBD =
    !skipPhysicalDelivery && delivery === "shipping" && !isMontevideo;
  const unitForMethod = (base: number) =>
    payMethod === "mercadopago" ? priceWithCardFee(base) : base;
  const subtotal = mounted
    ? items.reduce(
        (s, i) => s + unitForMethod(i.price) * i.quantity,
        0
      )
    : 0;
  const finalTotal = subtotal + shippingCost;

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "El nombre es obligatorio";
    if (!form.email.trim()) e.email = "El email es obligatorio";
    else if (!isValidEmail(form.email)) e.email = "Email inválido";
    if (!form.phone.trim()) e.phone = "El teléfono es obligatorio";
    else if (!isValidPhone(form.phone)) e.phone = "Formato de teléfono inválido";
    if (!skipPhysicalDelivery && delivery === "shipping") {
      if (!form.address.trim()) e.address = "La dirección es obligatoria";
      if (!form.city.trim()) e.city = "La ciudad es obligatoria";
      if (!form.departamento) e.departamento = "Seleccioná un departamento";
    }
    if (payMethod === "transfer") {
      if (!selectedAccountId) {
        e.paymentAccount = "Elegí una cuenta para transferir";
      }
    }
    return e;
  };

  const isFormValid = () => Object.keys(validate()).length === 0;

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validate());
  };

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setTimeout(() => setErrors(validate()), 0);
    }
  };

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <FiShoppingBag size={48} className="text-gray-300 mb-4" />
        <h1 className="font-display text-2xl font-bold text-gray-800 mb-2">
          Tu carrito está vacío
        </h1>
        <p className="text-gray-500 mb-6">Agregá productos para continuar</p>
        <Link href="/productos">
          <Button>Ver Productos</Button>
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <FiUser size={48} className="text-gray-300 mb-4" />
        <h1 className="font-display text-2xl font-bold text-gray-800 mb-2">
          Iniciá sesión para comprar
        </h1>
        <p className="text-gray-500 mb-6">
          Necesitás una cuenta para finalizar tu compra
        </p>
        <Link href="/login">
          <Button>Ingresar</Button>
        </Link>
      </div>
    );
  }

  if (cartMetaLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 px-4">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Preparando tu checkout…</p>
      </div>
    );
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    setTouched({
      name: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      departamento: true,
      paymentAccount: true,
    });

    if (Object.keys(validationErrors).length > 0) {
      toast.error("Completá todos los campos obligatorios");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            variant: i.variant,
          })),
          shipping: skipPhysicalDelivery
            ? {
                name: form.name,
                email: form.email,
                phone: form.phone,
                address: onlineCourseOnly
                  ? "Curso online — acceso en Mi aprendizaje (sin envío físico)"
                  : "Producto(s) digital(es) — sin envío ni retiro",
                city: "Digital",
                notes: form.notes,
                delivery: "digital",
                departamento: "—",
                shippingCost: 0,
              }
            : {
                name: form.name,
                email: form.email,
                phone: form.phone,
                address:
                  delivery === "pickup"
                    ? "Retiro en local - Solferino 4041, Buceo"
                    : `${form.address}, ${form.city}, ${form.departamento}${form.postalCode ? ` (CP: ${form.postalCode})` : ""}`,
                city:
                  delivery === "pickup" ? "Montevideo (Retiro)" : form.city,
                notes: form.notes,
                delivery,
                departamento: form.departamento,
                shippingCost,
              },
          paymentMethod:
            payMethod === "transfer" ? "BANK_TRANSFER" : "MERCADOPAGO",
          paymentAccountId:
            payMethod === "transfer" ? selectedAccountId : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error al procesar el pago");
        setLoading(false);
        return;
      }

      if (data.flow === "transfer") {
        clearCart();
        router.push(`/checkout/transferencia?orderId=${data.orderId}`);
        setLoading(false);
        return;
      }

      if (data.initPoint) {
        clearCart();
        window.location.href = data.initPoint;
      } else {
        clearCart();
        toast.success("¡Pedido creado exitosamente!");
        router.push(`/checkout/success?orderId=${data.orderId}`);
      }
    } catch {
      toast.error("Error al procesar el pedido");
    }

    setLoading(false);
  };

  const inputCls = (field: keyof FormErrors, base?: string) =>
    `w-full px-4 py-3 rounded-xl border-2 outline-none transition-all text-sm ${base || ""} ${
      touched[field] && errors[field]
        ? "border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-2 focus:ring-red-100"
        : "border-gray-100 bg-white focus:border-primary focus:ring-2 focus:ring-primary/10"
    }`;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-warm-gray">
          Finalizar Compra
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Completá tus datos para procesar el pedido
        </p>
      </div>

      <form onSubmit={handleCheckout}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left column: Form */}
          <div className="lg:col-span-3 space-y-6">
            {/* Personal info */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-primary-light/40 flex items-center justify-center text-primary">
                  <FiUser size={18} />
                </div>
                <h2 className="font-bold text-warm-gray">Datos personales</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Nombre completo <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    onBlur={() => handleBlur("name")}
                    placeholder="Tu nombre"
                    className={inputCls("name")}
                  />
                  {touched.name && errors.name && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <FiAlertCircle size={12} /> {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Email <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      onBlur={() => handleBlur("email")}
                      placeholder="tu@email.com"
                      className={inputCls("email", "pr-10")}
                    />
                    {form.email && isValidEmail(form.email) && (
                      <FiCheck
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
                      />
                    )}
                  </div>
                  {touched.email && errors.email && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <FiAlertCircle size={12} /> {errors.email}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Teléfono / WhatsApp <span className="text-primary">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    onBlur={() => handleBlur("phone")}
                    placeholder="099 123 456"
                    className={inputCls("phone")}
                  />
                  {touched.phone && errors.phone && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <FiAlertCircle size={12} /> {errors.phone}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {skipPhysicalDelivery && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-primary-light/20 rounded-2xl border border-primary/25 p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-primary shrink-0">
                    <FiCheck size={18} />
                  </div>
                  <div>
                    <h2 className="font-bold text-warm-gray text-sm mb-1">
                      {onlineCourseOnly ? "Curso online" : "Producto digital"}
                    </h2>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {onlineCourseOnly ? (
                        <>
                          No aplica envío ni retiro en local: el acceso al curso
                          es digital. Cuando el pago se confirme, lo vas a ver en{" "}
                          <strong>Mi aprendizaje</strong>.
                        </>
                      ) : (
                        <>
                          No aplica envío ni retiro en local: cuando el pago se
                          confirme vas a poder acceder a tu contenido digital
                          desde tu cuenta.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Delivery method */}
            {!skipPhysicalDelivery && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-accent-light/50 flex items-center justify-center text-accent-dark">
                    <FiTruck size={18} />
                  </div>
                  <h2 className="font-bold text-warm-gray">Método de entrega</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDelivery("shipping")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      delivery === "shipping"
                        ? "border-primary bg-primary-light/10"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FiTruck
                        size={20}
                        className={
                          delivery === "shipping"
                            ? "text-primary"
                            : "text-gray-400"
                        }
                      />
                      <div>
                        <p
                          className={`text-sm font-semibold ${delivery === "shipping" ? "text-primary-dark" : "text-gray-700"}`}
                        >
                          Envío a domicilio
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          DAC o cadetería
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDelivery("pickup")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      delivery === "pickup"
                        ? "border-secondary bg-secondary-light/10"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FiMapPin
                        size={20}
                        className={
                          delivery === "pickup"
                            ? "text-secondary-dark"
                            : "text-gray-400"
                        }
                      />
                      <div>
                        <p
                          className={`text-sm font-semibold ${delivery === "pickup" ? "text-secondary-dark" : "text-gray-700"}`}
                        >
                          Retiro en local
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Solferino 4041, Buceo
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                {delivery === "pickup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4 p-4 rounded-xl bg-secondary-light/15 text-sm text-gray-600"
                  >
                    <p className="font-medium text-secondary-dark mb-1">
                      Retiro en nuestro taller
                    </p>
                    <p>
                      Te avisaremos por WhatsApp cuando tu pedido esté listo para
                      retirar. Recordá esperar nuestra confirmación antes de venir.
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Shipping address */}
            <AnimatePresence>
              {!skipPhysicalDelivery && delivery === "shipping" && (
                <motion.div
                  initial={{ opacity: 0, y: 16, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm overflow-hidden"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-mint/40 flex items-center justify-center text-green-700">
                      <FiMapPin size={18} />
                    </div>
                    <h2 className="font-bold text-warm-gray">
                      Dirección de envío
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Dirección <span className="text-primary">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => updateField("address", e.target.value)}
                        onBlur={() => handleBlur("address")}
                        placeholder="Calle, número, apto"
                        className={inputCls("address")}
                      />
                      {touched.address && errors.address && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <FiAlertCircle size={12} /> {errors.address}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Ciudad / Localidad{" "}
                        <span className="text-primary">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        onBlur={() => handleBlur("city")}
                        placeholder="Ej: Pocitos"
                        className={inputCls("city")}
                      />
                      {touched.city && errors.city && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <FiAlertCircle size={12} /> {errors.city}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Departamento <span className="text-primary">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={form.departamento}
                          onChange={(e) =>
                            updateField("departamento", e.target.value)
                          }
                          onBlur={() => handleBlur("departamento")}
                          className={`${inputCls("departamento", "pr-10")} appearance-none`}
                        >
                          {DEPARTAMENTOS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                        <FiChevronDown
                          size={16}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Código postal{" "}
                        <span className="text-gray-400 font-normal">
                          (opcional)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={form.postalCode}
                        onChange={(e) =>
                          updateField("postalCode", e.target.value)
                        }
                        placeholder="11300"
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm"
                      />
                    </div>

                    {!skipPhysicalDelivery && delivery === "shipping" && (
                      <div className="sm:col-span-2 p-3 rounded-xl bg-accent-light/30 text-sm">
                        {isMontevideo ? (
                          <p className="text-accent-dark font-medium">
                            Envío por cadetería privada:{" "}
                            <span className="font-bold">
                              {formatPrice(SHIPPING_COST_MVD)}
                            </span>
                          </p>
                        ) : (
                          <p className="text-accent-dark">
                            Envío por DAC al interior.{" "}
                            <span className="font-medium">
                              El costo se calcula según destino y se confirma por
                              WhatsApp.
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notes */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-secondary-light/40 flex items-center justify-center text-secondary-dark">
                  <FiMessageCircle size={18} />
                </div>
                <h2 className="font-bold text-warm-gray">
                  Notas{" "}
                  <span className="font-normal text-sm text-gray-400">
                    (opcional)
                  </span>
                </h2>
              </div>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Instrucciones especiales, horarios de entrega preferidos, etc."
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm resize-none"
              />
            </motion.div>

            {/* Payment method */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-mint/40 flex items-center justify-center text-green-700">
                  <FiCreditCard size={18} />
                </div>
                <h2 className="font-bold text-warm-gray">Método de pago</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setPayMethod("mercadopago");
                    setErrors((prev) => ({ ...prev, paymentAccount: undefined }));
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    payMethod === "mercadopago"
                      ? "border-primary bg-primary-light/15"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <p className="text-sm font-bold text-warm-gray">Mercado Pago</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Tarjetas, efectivo y más
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod("transfer")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    payMethod === "transfer"
                      ? "border-secondary-dark bg-secondary-light/20"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <p className="text-sm font-bold text-warm-gray">
                    Transferencia bancaria
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Redes de cobranza o cuenta bancaria
                  </p>
                </button>
              </div>

              {payMethod === "transfer" && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Elegí dónde transferir
                  </p>
                  {accounts.length === 0 ? (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      No hay cuentas configuradas. Contactá al administrador o
                      elegí Mercado Pago.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {accounts.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setSelectedAccountId(a.id);
                            setTouched((t) => ({ ...t, paymentAccount: true }));
                            setErrors((prev) => ({ ...prev, paymentAccount: undefined }));
                          }}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                            selectedAccountId === a.id
                              ? "border-primary bg-primary-light/10"
                              : "border-gray-100 hover:border-primary-light/60"
                          }`}
                        >
                          <BankLogo
                            bankKey={a.bankKey}
                            bankName={a.bankName}
                            size={44}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-warm-gray">
                              {a.bankName}
                            </p>
                            <p className="text-xs text-gray-600">{a.holderName}</p>
                            <p className="text-xs font-mono text-primary-dark mt-0.5 break-all">
                              {a.accountNumber}
                            </p>
                          </div>
                          {selectedAccountId === a.id && (
                            <FiCheck className="text-primary shrink-0" size={18} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {touched.paymentAccount && errors.paymentAccount && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <FiAlertCircle size={12} /> {errors.paymentAccount}
                    </p>
                  )}
                </div>
              )}
            </motion.div>

            {/* WhatsApp info */}
            {!skipPhysicalDelivery && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-mint/15 border border-mint/30">
                <FaWhatsapp size={20} className="text-green-600 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600 leading-relaxed">
                  Luego de realizar el pago, nos contactaremos por{" "}
                  <strong className="text-green-700">WhatsApp</strong> para
                  coordinar la entrega de tu pedido.
                </p>
              </div>
            )}
          </div>

          {/* Right column: Summary */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm sticky top-24">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-primary-light/40 flex items-center justify-center text-primary">
                  <FiShoppingBag size={18} />
                </div>
                <h2 className="font-bold text-warm-gray">Tu pedido</h2>
              </div>

              <div className="space-y-4 mb-5">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variant}`}
                    className="flex gap-3"
                  >
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-soft-gray shrink-0">
                      <Image
                        src={resolveStoredProductImage(item.image)}
                        alt={item.name}
                        fill
                        unoptimized={isLocalUploadPath(
                          resolveStoredProductImage(item.image)
                        )}
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-warm-gray truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {item.variant && `${item.variant} · `}Cant:{" "}
                        {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-warm-gray shrink-0">
                      {formatPrice(
                        unitForMethod(item.price) * item.quantity
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-700 font-medium">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                {payMethod === "mercadopago" ? (
                  <p className="text-[11px] text-gray-500 -mt-1">
                    Podés <strong className="text-emerald-800">ahorrar un 12%</strong>{" "}
                    eligiendo transferencia bancaria.
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-800/90 -mt-1">
                    <strong>12% de descuento</strong> aplicado por pago con
                    transferencia.
                  </p>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    {skipPhysicalDelivery ? "Envío / retiro" : "Envío"}
                  </span>
                  <span className="text-gray-700 font-medium">
                    {skipPhysicalDelivery ? (
                      <span className="text-green-600 text-xs font-semibold">
                        No aplica (digital)
                      </span>
                    ) : delivery === "pickup" ? (
                      <span className="text-green-600">Gratis</span>
                    ) : showShippingTBD ? (
                      <span className="text-accent-dark text-xs">
                        A confirmar
                      </span>
                    ) : (
                      formatPrice(shippingCost)
                    )}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-100 mt-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-warm-gray">Total</span>
                  <span className="text-xl font-extrabold text-primary-dark">
                    {showShippingTBD
                      ? `${formatPrice(subtotal)} + envío`
                      : formatPrice(finalTotal)}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={
                  loading ||
                  !isFormValid() ||
                  (payMethod === "transfer" && accounts.length === 0)
                }
                size="lg"
                className="w-full mt-6"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Procesando…
                  </span>
                ) : payMethod === "transfer" ? (
                  "Confirmar pedido por transferencia"
                ) : (
                  "Pagar con Mercado Pago"
                )}
              </Button>

              {!isFormValid() && Object.keys(touched).length > 0 && (
                <p className="text-xs text-center text-gray-400 mt-3">
                  Completá todos los campos obligatorios para continuar
                </p>
              )}

              <p className="text-[11px] text-gray-400 text-center mt-4 leading-relaxed">
                Al confirmar tu compra, aceptás{" "}
                {!skipPhysicalDelivery && (
                  <>
                    las{" "}
                    <Link
                      href="/politicas-envio"
                      className="underline hover:text-primary"
                    >
                      políticas de envío
                    </Link>{" "}
                    y{" "}
                  </>
                )}
                <Link
                  href="/politicas-cambio"
                  className="underline hover:text-primary"
                >
                  políticas de cambio
                </Link>
                .
              </p>
            </div>
          </motion.div>
        </div>
      </form>
    </div>
  );
}
