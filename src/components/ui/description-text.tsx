import { cn } from "@/lib/utils";

/** Texto multilínea (respeta `\n` del textarea / DB). Base para futuro rich text. */
export function DescriptionText({
  children,
  className,
  as: Tag = "p",
}: {
  children: string | null | undefined;
  className?: string;
  as?: "p" | "div";
}) {
  const t = children?.trim();
  if (!t) return null;
  return (
    <Tag className={cn("whitespace-pre-line", className)}>{children}</Tag>
  );
}
