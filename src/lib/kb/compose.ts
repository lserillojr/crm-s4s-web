import { KB_CATALOG } from "./catalog";
import { templateFor } from "./templates";
import type { KbSection } from "./types";

/** Markdown final que a IA lê: blocos na ordem, com header numerado. */
export function composeKb(sections: KbSection[]): string {
  return (
    sections
      .map((s, i) => `## ${i + 1}. ${s.title}\n\n${s.content.trim()}`)
      .join("\n\n---\n\n") + "\n"
  );
}

/** Aplica content só nos blocos editable=true cujo key veio em `editable`. Travados intactos. */
export function mergeEditable(
  current: KbSection[],
  editable: Record<string, string>,
): KbSection[] {
  return current.map((s) =>
    s.editable && Object.prototype.hasOwnProperty.call(editable, s.key)
      ? { ...s, content: editable[s.key] ?? "" }
      : s,
  );
}

/** Monta os blocos do catálogo a partir do template da vertical. Corpo legado vai na identidade. */
export function initSections(vertical: string, legacyContent: string): KbSection[] {
  const tpl = templateFor(vertical);
  const sections: KbSection[] = KB_CATALOG.map((meta) => ({
    key: meta.key,
    title: meta.title,
    editable: meta.editable,
    // tpl is Record<string,string>; index returns string|undefined in strict mode
    content: tpl[meta.key] !== undefined ? tpl[meta.key]! : "",
  }));
  if (legacyContent?.trim()) {
    const id = sections.find((s) => s.key === "identidade");
    if (id) id.content = legacyContent.trim();
  }
  return sections;
}

/** Tamanho em bytes UTF-8 (limite 50KB do AC). */
export function kbByteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}
