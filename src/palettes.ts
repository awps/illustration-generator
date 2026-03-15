import data from "./palettes.json";

export interface PaletteEntry {
  colors: string[];
  totalColors: number;
  predominantColor: string;
  style: string;
  topic: string;
}

export interface ResolvedPalette extends PaletteEntry {
  id: string;
}

const { filters, palletes } = data as {
  filters: {
    predominantColor: string[];
    style: string[];
    topic: string[];
    totalColors: number[];
  };
  palletes: Record<string, PaletteEntry>;
};

const entries = Object.entries(palletes);
const allFilterValues = new Set<string>([
  ...filters.predominantColor,
  ...filters.style,
  ...filters.topic,
  ...filters.totalColors.map(String),
]);

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function classifyFilter(value: string): { field: string; value: string | number } | null {
  const asNum = Number(value);
  if (!isNaN(asNum) && filters.totalColors.includes(asNum))
    return { field: "totalColors", value: asNum };
  if (filters.predominantColor.includes(value))
    return { field: "predominantColor", value };
  if (filters.style.includes(value))
    return { field: "style", value };
  if (filters.topic.includes(value))
    return { field: "topic", value };
  return null;
}

export function resolvePalette(input: unknown): ResolvedPalette {
  // Omitted or null → random
  if (input == null) {
    const [id, entry] = pickRandom(entries);
    return { id, ...entry };
  }

  // String → exact ID lookup
  if (typeof input === "string") {
    const entry = palletes[input];
    if (!entry) {
      throw new Error(`palette "${input}" not found`);
    }
    return { id: input, ...entry };
  }

  // Array → filter
  if (Array.isArray(input)) {
    if (input.length === 0) {
      const [id, entry] = pickRandom(entries);
      return { id, ...entry };
    }

    const conditions: { field: string; value: string | number }[] = [];
    for (const v of input) {
      if (typeof v !== "string") {
        throw new Error(`palette filter values must be strings, got ${typeof v}`);
      }
      const classified = classifyFilter(v);
      if (!classified) {
        throw new Error(
          `invalid palette filter "${v}". Valid filters: ${[...allFilterValues].sort().join(", ")}`
        );
      }
      conditions.push(classified);
    }

    const matches = entries.filter(([, entry]) =>
      conditions.every(({ field, value }) =>
        (entry as any)[field] === value
      )
    );

    if (matches.length === 0) {
      throw new Error(
        `no palettes match filters: ${input.join(", ")}`
      );
    }

    const [id, entry] = pickRandom(matches);
    return { id, ...entry };
  }

  throw new Error('palette must be a string (ID), an array of filters, or omitted');
}
