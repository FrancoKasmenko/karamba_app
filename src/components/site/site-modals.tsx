"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { resolveMediaPath, isLocalUploadPath } from "@/lib/image-url";

type ModalRow = {
  id: string;
  name: string;
  active: boolean;
  frequency: string;
  showAgainAfterDays: number | null;
  layout: string;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  dismissLabel: string;
  sortOrder: number;
};

const NS = "karamba_sitemodal_";

/** Evita mostrar literales "null" guardados por error o datos viejos */
function displayText(s: string | null | undefined): string {
  const t = (s ?? "").trim();
  if (!t) return "";
  const low = t.toLowerCase();
  if (low === "null" || low === "undefined") return "";
  return t;
}

function shouldShowModal(m: ModalRow): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (m.frequency === "EVERY_SESSION") {
      return sessionStorage.getItem(`${NS}${m.id}_sess`) !== "1";
    }
    if (m.frequency === "ONCE_PER_BROWSER") {
      return localStorage.getItem(`${NS}${m.id}_once`) !== "1";
    }
    if (m.frequency === "AGAIN_AFTER_DAYS") {
      const raw = localStorage.getItem(`${NS}${m.id}_last`);
      if (!raw) return true;
      const last = parseInt(raw, 10);
      if (Number.isNaN(last)) return true;
      const days = m.showAgainAfterDays ?? 7;
      return Date.now() - last >= days * 86400000;
    }
  } catch {
    return true;
  }
  return true;
}

function dismissModal(m: ModalRow) {
  try {
    if (m.frequency === "EVERY_SESSION") {
      sessionStorage.setItem(`${NS}${m.id}_sess`, "1");
    } else if (m.frequency === "ONCE_PER_BROWSER") {
      localStorage.setItem(`${NS}${m.id}_once`, "1");
    } else if (m.frequency === "AGAIN_AFTER_DAYS") {
      localStorage.setItem(`${NS}${m.id}_last`, String(Date.now()));
    }
  } catch {
    /* ignore quota / private mode */
  }
}

export default function SiteModals() {
  const [list, setList] = useState<ModalRow[]>([]);
  const [current, setCurrent] = useState<ModalRow | null>(null);

  useEffect(() => {
    fetch("/api/site-modals")
      .then((r) => r.json())
      .then((d: unknown) => {
        if (!Array.isArray(d)) return;
        setList(d as ModalRow[]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (list.length === 0) return;
    const next = list.find(shouldShowModal);
    setCurrent(next ?? null);
  }, [list]);

  if (!current) return null;

  const img =
    current.imageUrl && current.layout === "IMAGE_TEXT"
      ? resolveMediaPath(current.imageUrl) || current.imageUrl
      : null;

  const titleText = displayText(current.title);
  const bodyText = displayText(current.body);
  const ctaHref = displayText(current.ctaHref);
  const ctaLabel = displayText(current.ctaLabel);
  const showCta = Boolean(ctaHref && ctaLabel);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleText ? "site-modal-title" : undefined}
      aria-label={titleText ? undefined : "Aviso"}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#fff7fb] border border-primary-light/40 shadow-2xl">
        <button
          type="button"
          onClick={() => {
            dismissModal(current);
            setCurrent(null);
          }}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 text-warm-gray hover:bg-white shadow border border-primary-light/30 text-sm font-bold"
          aria-label="Cerrar"
        >
          ×
        </button>

        <div className="p-6 sm:p-8">
          {current.layout === "TEXT_LOGO" && (
            <div className="flex justify-center mb-5">
              <Image
                src="/no-image.png"
                alt="Karamba"
                width={140}
                height={44}
                className="h-10 w-auto object-contain"
              />
            </div>
          )}

          {img && (
            <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden mb-5 bg-soft-gray border border-primary-light/20">
              <Image
                src={img}
                alt=""
                fill
                className="object-cover"
                unoptimized={isLocalUploadPath(img)}
              />
            </div>
          )}

          {titleText ? (
            <h2
              id="site-modal-title"
              className="text-xl font-extrabold text-warm-gray text-center mb-2"
            >
              {titleText}
            </h2>
          ) : null}

          {bodyText ? (
            <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed text-center mb-6">
              {bodyText}
            </div>
          ) : null}

          <div
            className={`flex flex-col sm:flex-row gap-2 sm:justify-center ${
              !titleText && !bodyText && img ? "mt-2" : ""
            }`}
          >
            {showCta ? (
              <Link
                href={ctaHref}
                className="inline-flex justify-center items-center px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors"
              >
                {ctaLabel}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => {
                dismissModal(current);
                setCurrent(null);
              }}
              className="inline-flex justify-center items-center px-5 py-2.5 rounded-xl border-2 border-primary-light/50 text-warm-gray text-sm font-semibold hover:bg-white transition-colors"
            >
              {current.dismissLabel || "Cerrar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
