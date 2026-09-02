export const AREAS = [
  "Biologia",
  "Ciências Humanas",
  "Educação Física",
  "Filosofia",
  "Física",
  "Geografia",
  "História",
  "Inglês",
  "Literatura",
  "Matemática",
  "Meio Ambiente",
  "Português",
  "Química",
  "Saúde",
  "Sociologia",
  "Tecnologia e Informática",
  "Outros",
] as const;

export type Area = (typeof AREAS)[number];

/** Normaliza texto: minúsculas, sem acento, sem pontuação repetida. */
export function norm(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Similaridade simples por bag-of-words (Jaccard) — usada na detecção de duplicatas. */
export function similarity(a: string, b: string): number {
  const wa = new Set(norm(a).split(/[^a-z0-9]+/).filter((w) => w.length > 2));
  const wb = new Set(norm(b).split(/[^a-z0-9]+/).filter((w) => w.length > 2));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  wa.forEach((w) => { if (wb.has(w)) inter++; });
  return inter / (wa.size + wb.size - inter);
}

export function parseKeywords(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[,;\n]/)
        .map((k) => k.trim())
        .filter((k) => k.length > 1)
        .slice(0, 15),
    ),
  );
}
