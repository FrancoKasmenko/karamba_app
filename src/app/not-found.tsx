import Link from "next/link";
import Button from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <h1 className="font-display text-6xl font-bold text-primary-light mb-4">
        404
      </h1>
      <h2 className="font-display text-2xl font-bold text-gray-800 mb-2">
        Página no encontrada
      </h2>
      <p className="text-gray-500 mb-6">
        La página que buscás no existe o fue movida
      </p>
      <Link href="/">
        <Button>Volver al inicio</Button>
      </Link>
    </div>
  );
}
