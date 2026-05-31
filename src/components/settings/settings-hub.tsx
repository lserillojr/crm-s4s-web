import Link from "next/link";
import { SETTINGS_SECTIONS } from "@/lib/settings-sections";

/** Hub de Configurações: um card por seção. Mesma fonte (SETTINGS_SECTIONS) que
 * alimenta o submenu da Sidebar, então nenhuma tela fica órfã. */
export function SettingsHub() {
  return (
    <section
      className="grid grid-cols-1 gap-4 md:grid-cols-3"
      aria-label="Seções de configuração"
    >
      {SETTINGS_SECTIONS.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          data-testid={`settings-card-${s.href}`}
          className="flex flex-col gap-2 rounded-lg border bg-white p-5 transition-colors hover:border-s4s-blue"
        >
          <span className="flex items-center gap-2 font-heading text-lg font-semibold text-s4s-blue">
            <s.icon aria-hidden="true" className="h-5 w-5" />
            {s.label}
          </span>
          <span className="text-sm text-muted-foreground">{s.description}</span>
        </Link>
      ))}
    </section>
  );
}
