import { outroTemplate } from "./outro";
import { inglesTemplate } from "./ingles";

/** Mapa vertical → corpos por key. Verticais sem template caem em outro. */
export const KB_TEMPLATES: Record<string, Record<string, string>> = {
  ingles: inglesTemplate,
  outro: outroTemplate,
};
export function templateFor(vertical: string): Record<string, string> {
  return KB_TEMPLATES[vertical] ?? (KB_TEMPLATES.outro as Record<string, string>);
}
