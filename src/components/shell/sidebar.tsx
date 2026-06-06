"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  Filter,
  CalendarDays,
  BarChart3,
  Users,
  Settings,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { SETTINGS_SECTIONS } from "@/lib/settings-sections";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: { href: string; label: string }[];
};

/** Ordem da jornada do MEI: ver (Início) → atender → gerir → contatos → config. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/atendimento", label: "Atendimento", icon: MessageSquare },
  { href: "/funil", label: "Funil", icon: Filter },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/contatos", label: "Contatos", icon: Users },
  {
    href: "/settings",
    label: "Config",
    icon: Settings,
    children: SETTINGS_SECTIONS.map((s) => ({ href: s.href, label: s.label })),
  },
];

const baseItem =
  "flex items-center gap-2 rounded px-3 py-2 text-sm text-s4s-blue hover:bg-s4s-gray-light";
const activeItem = "bg-s4s-blue text-white hover:bg-s4s-blue";

export function Sidebar({ items = NAV_ITEMS }: { items?: NavItem[] }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav
      aria-label="Navegação principal"
      className="flex w-56 shrink-0 flex-col gap-1 border-r bg-white p-3"
    >
      {items.map((item) =>
        item.children ? (
          <NavGroup key={item.href} item={item} pathname={pathname} isActive={isActive} />
        ) : (
          <Link
            key={item.href}
            href={item.href}
            data-testid={`nav-${item.href}`}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={`${baseItem} ${isActive(item.href) ? activeItem : ""}`}
          >
            <item.icon aria-hidden="true" className="h-4 w-4" />
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );
}

function NavGroup({
  item,
  pathname,
  isActive,
}: {
  item: NavItem;
  pathname: string;
  isActive: (href: string) => boolean;
}) {
  const groupActive = isActive(item.href);
  // Auto-expande quando o usuário já está numa seção de Config; o toggle manual
  // (override) tem precedência sobre o cálculo por rota.
  const [override, setOverride] = useState<boolean | null>(null);
  const open = override ?? groupActive;

  return (
    <div>
      <button
        type="button"
        data-testid={`nav-${item.href}`}
        aria-expanded={open}
        aria-current={groupActive ? "page" : undefined}
        onClick={() => setOverride(!open)}
        className={`${baseItem} w-full justify-between ${groupActive ? activeItem : ""}`}
      >
        <span className="flex items-center gap-2">
          <item.icon aria-hidden="true" className="h-4 w-4" />
          {item.label}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="ml-4 mt-1 flex flex-col gap-1 border-l pl-2">
          {item.children!.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              data-testid={`nav-${child.href}`}
              aria-current={isActive(child.href) ? "page" : undefined}
              className={`${baseItem} ${isActive(child.href) ? activeItem : ""}`}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
