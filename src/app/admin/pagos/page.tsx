"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";
import {
  FiCreditCard,
  FiCheck,
  FiAlertCircle,
  FiCopy,
  FiGlobe,
} from "react-icons/fi";

interface Settings {
  mercadoPagoAccessToken: string | null;
  mercadoPagoPublicKey: string | null;
  mercadoPagoEnabled: boolean;
}

export default function AdminPagosPage() {
  const [settings, setSettings] = useState<Settings>({
    mercadoPagoAccessToken: null,
    mercadoPagoPublicKey: null,
    mercadoPagoEnabled: false,
  });
  const [form, setForm] = useState({
    accessToken: "",
    publicKey: "",
    enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setForm({
          accessToken: data.mercadoPagoAccessToken || "",
          publicKey: data.mercadoPagoPublicKey || "",
          enabled: data.mercadoPagoEnabled,
        });
        setLoading(false);
      });

    fetch("/api/webhook-url")
      .then((r) => r.json())
      .then((data) => setWebhookUrl(data.webhookUrl || ""))
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mercadoPagoAccessToken: form.accessToken,
          mercadoPagoPublicKey: form.publicKey,
          mercadoPagoEnabled: form.enabled,
        }),
      });

      const data = await res.json();
      setSettings(data);
      toast.success("Configuración de pagos guardada");
    } catch {
      toast.error("Error al guardar");
    }

    setSaving(false);
  };

  const copyWebhookUrl = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      toast.success("URL copiada al portapapeles");
    }
  };

  if (loading) return <div className="text-gray-400 py-10">Cargando...</div>;

  const isActive =
    settings.mercadoPagoEnabled && settings.mercadoPagoAccessToken;
  const isNgrok = webhookUrl.includes("ngrok");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-warm-gray mb-1">
        Mercado Pago
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Credenciales y webhook. Las cuentas para transferencias están en{" "}
        <Link href="/admin/cuentas-pago" className="text-primary-dark font-semibold hover:underline">
          Cuentas de pago
        </Link>
        .
      </p>

      <div className="max-w-2xl space-y-6">
        {/* Status */}
        <div
          className={`rounded-2xl p-5 flex items-center gap-4 ${
            isActive
              ? "bg-green-50 border border-green-200"
              : "bg-yellow-50 border border-yellow-200"
          }`}
        >
          {isActive ? (
            <>
              <FiCheck size={24} className="text-green-600 shrink-0" />
              <div>
                <p className="font-medium text-green-800">
                  MercadoPago está activo
                </p>
                <p className="text-sm text-green-600">
                  Los clientes pueden pagar con MercadoPago
                </p>
              </div>
            </>
          ) : (
            <>
              <FiAlertCircle size={24} className="text-yellow-600 shrink-0" />
              <div>
                <p className="font-medium text-yellow-800">
                  MercadoPago no configurado
                </p>
                <p className="text-sm text-yellow-600">
                  Ingresá tus credenciales para activar los pagos
                </p>
              </div>
            </>
          )}
        </div>

        {/* Credentials form */}
        <form onSubmit={handleSave}>
          <div className="bg-white rounded-2xl border border-primary-light/30 p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <FiCreditCard size={20} className="text-primary-dark" />
              <h2 className="font-display text-lg font-semibold text-gray-800">
                MercadoPago
              </h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Access Token
              </label>
              <input
                type="password"
                value={form.accessToken}
                onChange={(e) =>
                  setForm({ ...form, accessToken: e.target.value })
                }
                placeholder="APP_USR-xxxx..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">
                Lo encontrás en tu panel de MercadoPago → Credenciales
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Public Key (opcional)
              </label>
              <input
                type="text"
                value={form.publicKey}
                onChange={(e) =>
                  setForm({ ...form, publicKey: e.target.value })
                }
                placeholder="APP_USR-xxxx..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-mono"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) =>
                  setForm({ ...form, enabled: e.target.checked })
                }
                className="rounded border-gray-300 text-primary focus:ring-primary w-5 h-5"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Activar MercadoPago
                </span>
                <p className="text-xs text-gray-400">
                  Cuando esté activo, los clientes pagarán a través de
                  MercadoPago
                </p>
              </div>
            </label>
          </div>

          <div className="mt-5">
            <Button type="submit" disabled={saving} size="lg">
              {saving ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </div>
        </form>

        {/* Webhook URL */}
        <div className="bg-white rounded-2xl border border-primary-light/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <FiGlobe size={20} className="text-secondary-dark" />
            <h2 className="font-display text-lg font-semibold text-gray-800">
              Webhook
            </h2>
          </div>

          <p className="text-xs text-gray-500 mb-3">
            Configurá esta URL en tu panel de MercadoPago → Webhooks para
            recibir notificaciones de pago:
          </p>

          {webhookUrl ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-soft-gray px-4 py-2.5 rounded-lg text-xs text-warm-gray border border-gray-100 truncate">
                {webhookUrl}
              </code>
              <button
                type="button"
                onClick={copyWebhookUrl}
                className="p-2.5 rounded-lg bg-soft-gray hover:bg-primary-light/30 text-gray-500 hover:text-primary transition-colors"
              >
                <FiCopy size={16} />
              </button>
            </div>
          ) : (
            <code className="block bg-soft-gray px-4 py-2.5 rounded-lg text-xs text-gray-400 border border-gray-100">
              Cargando...
            </code>
          )}

          {isNgrok && (
            <div className="mt-3 p-3 rounded-lg bg-accent-light/30 text-xs text-accent-dark">
              <strong>Modo desarrollo:</strong> usando ngrok para recibir
              webhooks. Asegurate de que ngrok esté corriendo y{" "}
              <code className="bg-white/50 px-1 rounded">BASE_URL</code> en tu{" "}
              <code className="bg-white/50 px-1 rounded">.env</code> sea la URL
              de ngrok.
            </div>
          )}

          {!webhookUrl.includes("localhost") &&
            !isNgrok &&
            webhookUrl && (
              <div className="mt-3 p-3 rounded-lg bg-green-50 text-xs text-green-700">
                <strong>Producción:</strong> webhook configurado con URL pública.
              </div>
            )}

          {webhookUrl.includes("localhost") && (
            <div className="mt-3 p-3 rounded-lg bg-yellow-50 text-xs text-yellow-700">
              <strong>Atención:</strong> los webhooks no funcionan con
              localhost. Configurá{" "}
              <code className="bg-white/50 px-1 rounded">BASE_URL</code> en tu{" "}
              <code className="bg-white/50 px-1 rounded">.env</code> con tu URL
              de ngrok.
            </div>
          )}
        </div>

        {/* Setup guide */}
        <div className="bg-beige rounded-2xl p-5">
          <h3 className="font-semibold text-warm-gray mb-3 text-sm">
            Cómo probar webhooks en local
          </h3>
          <ol className="space-y-2 text-xs text-gray-600">
            <li className="flex gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary-light/50 text-primary-dark flex items-center justify-center font-bold text-[10px]">
                1
              </span>
              <span>
                Instalá ngrok:{" "}
                <code className="bg-white px-1.5 py-0.5 rounded text-primary-dark">
                  npm install -g ngrok
                </code>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary-light/50 text-primary-dark flex items-center justify-center font-bold text-[10px]">
                2
              </span>
              <span>
                Ejecutá:{" "}
                <code className="bg-white px-1.5 py-0.5 rounded text-primary-dark">
                  ngrok http 3000
                </code>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary-light/50 text-primary-dark flex items-center justify-center font-bold text-[10px]">
                3
              </span>
              <span>
                Copiá la URL (ej:{" "}
                <code className="bg-white px-1.5 py-0.5 rounded text-primary-dark">
                  https://abc123.ngrok-free.app
                </code>
                )
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary-light/50 text-primary-dark flex items-center justify-center font-bold text-[10px]">
                4
              </span>
              <span>
                Pegala en{" "}
                <code className="bg-white px-1.5 py-0.5 rounded text-primary-dark">
                  .env
                </code>{" "}
                como{" "}
                <code className="bg-white px-1.5 py-0.5 rounded text-primary-dark">
                  BASE_URL=&quot;https://abc123.ngrok-free.app&quot;
                </code>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary-light/50 text-primary-dark flex items-center justify-center font-bold text-[10px]">
                5
              </span>
              <span>Reiniciá el servidor de desarrollo</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
