export default function SolucionesDigitalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-soluciones-digitales
      className="min-h-full w-full bg-zinc-950"
    >
      {children}
    </div>
  );
}
