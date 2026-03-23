const BRANDS: Record<string, { label: string; className: string }> = {
  itau: { label: "ITAÚ", className: "bg-[#EC7000] text-white" },
  brou: { label: "BROU", className: "bg-[#003DA5] text-white" },
  scotiabank: { label: "Scotia", className: "bg-[#ED0722] text-white" },
  midinero: { label: "MD", className: "bg-[#7C3AED] text-white" },
  giro: { label: "GIRO", className: "bg-[#0D9488] text-white" },
  generic: { label: "★", className: "bg-primary-light text-primary-dark" },
};

export default function BankLogo({
  bankKey,
  bankName = "",
  size = 48,
}: {
  bankKey: string;
  bankName?: string;
  size?: number;
}) {
  const key = bankKey.toLowerCase() in BRANDS ? bankKey.toLowerCase() : "generic";
  const b = BRANDS[key];

  return (
    <div
      title={bankName || undefined}
      className={`rounded-xl shrink-0 border border-white/60 shadow-sm flex items-center justify-center font-black tracking-tight ${b.className}`}
      style={{ width: size, height: size, fontSize: size > 44 ? 12 : 10 }}
    >
      {b.label}
    </div>
  );
}
