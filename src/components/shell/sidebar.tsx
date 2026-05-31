"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  Filter,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Ordem da jornada do MEI: ver (Início) → atender → gerir → contatos → config. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/atendimento", label: "Atendimento", icon: MessageSquare },
  { href: "/funil", label: "Funil", icon: Filter },
  { href: "/contatos", label: "Contatos", icon: Users },
  { href: "/settings/integracoes", label: "Config", icon: Settings },
];

export function Sidebar({ items = NAV_ITEMS }: { items?: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="flex w-56 shrink-0 flex-col gap-1 border-r bg-white p-3"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            data-testid={`nav-${href}`}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded px-3 py-2 text-sm ${
              active
                ? "bg-s4s-blue text-white"
                : "text-s4s-blue hover:bg-s4s-gray-light"
            }`}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
