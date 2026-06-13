/**
 * Normalizes free text into a URL-safe slug `^[a-z0-9-]+$`.
 * Removes accents via NFD decomposition, lowercases, replaces non-alphanumeric
 * with `-`, collapses and trims dashes.
 *
 * Order matters: normalize("NFD") must run BEFORE toLowerCase() so that
 * composed accented chars (e.g. Ç) are decomposed before case folding.
 *
 * Canonical implementation — kept in sync with src/lib/onboarding/contract.ts slugify.
 */
export function slugify(input: string): string {
  const slug = (input ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return slug || "produto";
}
