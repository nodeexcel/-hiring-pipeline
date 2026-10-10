/** MOSS-style winnowing fingerprint similarity over normalized code tokens. */
const TOKEN_RE = /[A-Za-z_][A-Za-z0-9_]*|\d+|[^\sA-Za-z0-9_]/g;

export function normalizeTokens(code: string): string[] {
  const stripped = code
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ")
    .replace(/#.*$/gm, " ");
  const raw = stripped.match(TOKEN_RE) ?? [];
  // Collapse identifiers/numbers so renaming variables does not hide a copy.
  const KEYWORDS = new Set([
    "if", "else", "for", "while", "return", "function", "def", "class", "int", "long",
    "const", "let", "var", "public", "private", "static", "void", "new", "import", "from",
    "break", "continue", "in", "of", "true", "false", "null", "None", "True", "False",
  ]);
  return raw.map((t) => (KEYWORDS.has(t) ? t : /^[A-Za-z_]/.test(t) ? "ID" : /^\d/.test(t) ? "NUM" : t));
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function fingerprints(code: string, k = 5, window = 4): Set<number> {
  const tokens = normalizeTokens(code);
  if (tokens.length < k) return new Set();
  const hashes: number[] = [];
  for (let i = 0; i + k <= tokens.length; i++) hashes.push(hash(tokens.slice(i, i + k).join(" ")));
  const out = new Set<number>();
  for (let i = 0; i + window <= hashes.length; i++) {
    out.add(Math.min(...hashes.slice(i, i + window)));
  }
  if (out.size === 0 && hashes.length > 0) out.add(Math.min(...hashes));
  return out;
}

/** Jaccard similarity of fingerprints, 0..1. */
export function similarity(a: string, b: string): number {
  const fa = fingerprints(a);
  const fb = fingerprints(b);
  if (fa.size === 0 || fb.size === 0) return 0;
  let inter = 0;
  for (const h of fa) if (fb.has(h)) inter++;
  return inter / (fa.size + fb.size - inter);
}
