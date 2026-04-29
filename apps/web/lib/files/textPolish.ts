/**
 * Strip the Oxford / serial comma. Examples:
 *   "A, B, and C"   -> "A, B and C"
 *   "X, Y, or Z"    -> "X, Y or Z"
 *   "alpha, beta, & gamma" -> "alpha, beta & gamma"
 * Idempotent and safe on already-clean text.
 */
export function noOxford(input: string | undefined | null): string {
  if (!input) return "";
  // Match a comma + optional whitespace + (and|or|&) followed by a word boundary.
  return input
    .replace(/,(\s+)(and|or|&)\b/gi, "$1$2")
    // Also catch the no-space variant ", and"
    .replace(/,(and|or|&)\b/gi, " $1");
}

/** Apply noOxford recursively over arrays/objects of strings. */
export function polishStrings<T>(value: T): T {
  if (typeof value === "string") return noOxford(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => polishStrings(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: any = Array.isArray(value) ? [] : {};
    for (const [k, v] of Object.entries(value as any)) out[k] = polishStrings(v);
    return out;
  }
  return value;
}
