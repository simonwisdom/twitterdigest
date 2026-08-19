// Truncate without splitting surrogate pairs (emoji etc.), and strip any lone
// surrogates — an unpaired surrogate makes the string unserializable as JSON
// for API requests.
export function safeTruncate(s: string, max: number): string {
  const cut = s.length > max ? s.slice(0, max) : s;
  return cut
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}
