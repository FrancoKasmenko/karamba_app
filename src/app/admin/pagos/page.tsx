"use client";
import { api } from "@/lib/public-api";

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
  mercadoPagoTokenConfigured?: boolean;
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
    fetch(api("/api/admin/settings"))
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          toast.error(data?.error || "No se pudo cargar la configuración de pagos");
          setLoading(false);
          return;
        }
        setSettings(data);
        setForm({
          accessToken: "",
          publicKey: data.mercadoPagoPublicKey || "",
          enabled: Boolean(data.mercadoPagoEnabled),
        });
        setLoading(false);
      })
      .catch(() => {
        toast.error("Error de red al cargar pagos");
        setLoading(false);
      });

    fetch(api("/api/webhook-url"))
      .then((r) => r.json())
      .then((data) => setWebhookUrl(data.webhookUrl || ""))
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        mercadoPagoPublicKey: form.publicKey,
        mercadoPagoEnabled: form.enabled,
      };
      const trimmedToken = form.accessToken.trim();
      if (trimmedToken.length > 0) {
        payload.mercadoPagoAccessToken = trimmedToken;
      }

      const res = await fetch(api("/api/admin/settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "No se pudo guardar");
        setSaving(false);
        return;
      }
      setSettings(data);
      setForm((f) => ({
        ...f,
        accessToken: "",
        publicKey: data.mercadoPagoPublicKey || "",
        enabled: Boolean(data.mercadoPagoEnabled),
      }));
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

  const tokenOk =
    settings.mercadoPagoTokenConfigured ?? Boolean(settings.mercadoPagoAccessToken);
  const isActive = settings.mercadoPagoEnabled && tokenOk;
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

      <div className="max-w-2xl mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 text-sm text-blue-950">
        <p className="font-semibold mb-2">Qué credenciales usar (Checkout Pro)</p>
        <ul className="list-disc pl-5 space-y-1.5 text-blue-900/90">
          <li>
            <strong>No</strong> hace falta <strong>Client ID</strong> ni{" "}
            <strong>Client Secret</strong> para esta integración: el servidor solo usa el{" "}
            <strong>Access token</strong> de Mercado Pago.
          </li>
          <li>
            En el panel: tu aplicación → <strong>Credenciales de producción</strong> → copiá el
            valor que diga <strong>Access token</strong> (suele ser largo; muchas cuentas usan
            prefijo <code className="bg-white/80 px-1 rounded text-xs">APP_USR-</code>).
          </li>
          <li>
            No pegues la <strong>Public Key</strong> en el campo del Access token: son dos cosas
            distintas. La Public key en Karamba es opcional.
          </li>
          <li>
            Usá siempre token de <strong>producción</strong> en el sitio en vivo; el de{" "}
            <strong>prueba</strong> solo sirve en entornos de test.
          </li>
        </ul>
      </div>

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
              {tokenOk && !form.accessToken && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-2">
                  Ya hay un token guardado. Dejá el campo vacío para conservarlo, o pegá
                  uno nuevo para reemplazarlo.
                </p>
              )}
              <input
                type="password"
                value={form.accessToken}
                onChange={(e) =>
                  setForm({ ...form, accessToken: e.target.value })
                }
                placeholder={
                  tokenOk
                    ? "Nuevo token (opcional)…"
                    : "APP_USR-… (credenciales de producción)"
                }
                autoComplete="off"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">
                Mercado Pago → Tu negocio → Configuración → Credenciales de producción
                (no uses el token de prueba en el sitio real).
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
            recibir notificaciones de pago. Mercado Pago exige{" "}
            <strong>https://</strong> en producción: la variable{" "}
            <code className="bg-soft-gray px-1 rounded">BASE_URL</code> o{" "}
            <code className="bg-soft-gray px-1 rounded">NEXT_PUBLIC_SITE_URL</code>{" "}
            debe ser tu dominio con HTTPS (sin barra final).
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
