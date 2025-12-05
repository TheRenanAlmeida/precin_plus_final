// Narrowings úteis
export function isRecord(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

export function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === "string");
}

// Converte qualquer coisa em string[], com segurança
export function toStringArray(x: unknown): string[] {
  if (Array.isArray(x)) return x.map((v) => String(v));
  return [];
}

// Guard genérico para indexing seguro
export function hasKey<T extends object>(
  obj: T,
  key: PropertyKey
): key is keyof T {
  return key in obj;
}
