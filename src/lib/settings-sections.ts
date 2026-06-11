import { Plug, BookOpen, Clock, BellRing, type LucideIcon } from "lucide-react";

export interface SettingsSection {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/**
 * Fonte única das seções de Configurações. Consumida pela Sidebar (submenu
 * expansível em "Config") e pelo hub /settings (cards). Mantém ambos em sincronia
 * e evita telas órfãs: toda seção listada aqui é alcançável pelos dois caminhos.
 */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    href: "/settings/integracoes",
    label: "Integrações",
    description: "Status do WhatsApp, Google Agenda e Instagram. Reconecte quando precisar.",
    icon: Plug,
  },
  {
    href: "/settings/kb",
    label: "Base de Conhecimento",
    description: "O que sua IA sabe sobre o seu negócio para responder os clientes.",
    icon: BookOpen,
  },
  {
    href: "/settings/working-hours",
    label: "Horários",
    description: "Defina seus horários de atendimento para a IA agendar nos momentos certos.",
    icon: Clock,
  },
  {
    href: "/settings/acompanhamento",
    label: "Acompanhamento",
    description: "A IA reativa clientes que sumiram ou não compareceram — ligue e ajuste do seu jeito.",
    icon: BellRing,
  },
];
