/**
 * Parseo seguro de respuestas fetch: evita que un HTML/502 rompa con .json()
 * y unifica mensajes para la UI.
 */

export type FetchJsonOk<T> = { ok: true; data: T; status: number };
export type FetchJsonErr =
  | {
      ok: false;
      kind: "network";
      message: string;
    }
  | {
      ok: false;
      kind: "http";
      status: number;
      message: string;
      bodySnippet?: string;
    }
  | {
      ok: false;
      kind: "parse";
      message: string;
      bodySnippet?: string;
      status: number;
    };

export type FetchJsonResult<T> = FetchJsonOk<T> | FetchJsonErr;

function pickMessageFromJson(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  const err = o.error;
  if (typeof err === "string" && err.trim()) return err;
  const msg = o.message;
  if (typeof msg === "string" && msg.trim()) return msg;
  return null;
}

/** Lee el cuerpo y parsea JSON; si falla el parseo o el HTTP, devuelve error legible. */
export async function parseFetchJson<T = unknown>(
  res: Response
): Promise<FetchJsonResult<T>> {
  const text = await res.text();
  const snippet = text.length > 400 ? `${text.slice(0, 400)}…` : text;

  if (!res.ok) {
    try {
      const j = JSON.parse(text) as unknown;
      const msg = pickMessageFromJson(j);
      if (msg) {
        return {
          ok: false,
          kind: "http",
          status: res.status,
          message: msg,
          bodySnippet: snippet,
        };
      }
      return {
        ok: false,
        kind: "http",
        status: res.status,
        message: `Error ${res.status}: ${res.statusText || "solicitud fallida"}`,
        bodySnippet: snippet,
      };
    } catch {
      const trimmed = text.trim();
      const looksHtml = trimmed.startsWith("<") || trimmed.includes("<!DOCTYPE");
      return {
        ok: false,
        kind: "http",
        status: res.status,
        message: looksHtml
          ? `El servidor respondió con una página de error (${res.status}), no con datos JSON.`
          : trimmed.slice(0, 280) || `Error ${res.status}`,
        bodySnippet: snippet,
      };
    }
  }

  try {
    const data = JSON.parse(text) as T;
    return { ok: true, data, status: res.status };
  } catch {
    return {
      ok: false,
      kind: "parse",
      status: res.status,
      message:
        "La respuesta no era JSON válido. Puede ser un error temporal del servidor.",
      bodySnippet: snippet,
    };
  }
}

export async function fetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<FetchJsonResult<T>> {
  try {
    const res = await fetch(input, init);
    return parseFetchJson<T>(res);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "No se pudo conectar con el servidor.";
    return { ok: false, kind: "network", message };
  }
}

/** Texto plano para toast o párrafos. */
export function fetchJsonErrorMessage(r: FetchJsonErr): string {
  if (r.kind === "network") return r.message;
  return r.message;
}

/** Bloque bonito tipo JSON para mostrar en cajas de error. */
export function formatErrorForDisplay(message: string): string {
  const t = message.trim();
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      return JSON.stringify(JSON.parse(t), null, 2);
    } catch {
      return message;
    }
  }
  return message;
}
