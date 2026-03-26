"use client";
import { api } from "@/lib/public-api";
import { fetchJsonErrorMessage, parseFetchJson } from "@/lib/fetch-json";

import { useState } from "react";
import Button from "@/components/ui/button";
import { FiDownload } from "react-icons/fi";
import toast from "react-hot-toast";

export default function CourseCertificateButton({
  courseId,
  label = "Descargar certificado",
}: {
  courseId: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    try {
      const res = await fetch(api(`/api/courses/certificate/${courseId}`), {
        credentials: "include",
      });
      if (!res.ok) {
        const parsed = await parseFetchJson<{ error?: string }>(res);
        toast.error(
          !parsed.ok ? fetchJsonErrorMessage(parsed) : "No se pudo descargar"
        );
        setLoading(false);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      let filename = "certificado-karamba.pdf";
      if (cd) {
        const m = cd.match(/filename="?([^";]+)"?/);
        if (m) filename = m[1];
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Certificado descargado");
    } catch {
      toast.error("Error de red");
    }
    setLoading(false);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={() => void download()}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2 inline-block align-middle" />
      ) : (
        <FiDownload className="mr-1.5 inline" size={16} />
      )}
      {label}
    </Button>
  );
}
