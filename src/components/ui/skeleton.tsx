import { cn } from "@/lib/utils";

/** Bloco placeholder pulsante — feedback de "carregando" enquanto o conteúdo
 * real não chegou. Use compondo vários para esboçar o layout da tela. */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-s4s-gray-light", className)}
      {...props}
    />
  );
}

export { Skeleton };
