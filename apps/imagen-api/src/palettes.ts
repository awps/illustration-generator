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

if (!data || typeof data !== "object") {
  console.error("[palettes] Failed to load palettes.json — data is", typeof data);
  throw new Error("palettes.json failed to load or is empty");
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

if (!filters || !palletes) {
  console.error("[palettes] palettes.json is missing required fields. Keys found:", Object.keys(data));
  throw new Error("palettes.json is malformed — missing 'filters' or 'palletes'");
}

const entries = Object.entries(palletes);

if (entries.length === 0) {
  console.error("[palettes] palettes.json has 0 palette entries");
  throw new Error("palettes.json contains no palettes");
}

console.log(`[palettes] Loaded ${entries.length} palettes`);

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

// --- Contrasting dark background color ---

// Predefined dark background colors across the hue spectrum.
// Each is dark (good for bg) but tinted with a distinct hue.
const DARK_BACKGROUNDS: { color: string; hue: number }[] = [
  { color: "#0D1B2A", hue: 215 },  // navy
  { color: "#1B2A0D", hue: 90 },   // forest
  { color: "#2A0D1B", hue: 330 },  // burgundy
  { color: "#2A1B0D", hue: 30 },   // warm brown
  { color: "#1B0D2A", hue: 270 },  // purple
  { color: "#0D2A2A", hue: 180 },  // teal
  { color: "#2A2A0D", hue: 60 },   // olive
  { color: "#2A0D2A", hue: 300 },  // magenta
];

function hexToHue(hex: string): number | null {
  const m = hex.match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const r = parseInt(m[1].substring(0, 2), 16) / 255;
  const g = parseInt(m[1].substring(2, 4), 16) / 255;
  const b = parseInt(m[1].substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max - min < 0.05) return null; // achromatic
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return h * 360;
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 360 - d);
}

/**
 * Pick a dark background color whose hue is maximally distant
 * from the illustration palette's colors.
 */
export function pickBackgroundColor(paletteColors: string[]): string {
  const hues = paletteColors.map(hexToHue).filter((h): h is number => h !== null);

  // All achromatic (grays/blacks/whites) — any hue works, pick random
  if (hues.length === 0) {
    return pickRandom(DARK_BACKGROUNDS).color;
  }

  let best = DARK_BACKGROUNDS[0];
  let bestMinDist = 0;

  for (const bg of DARK_BACKGROUNDS) {
    const minDist = Math.min(...hues.map(h => hueDistance(h, bg.hue)));
    if (minDist > bestMinDist) {
      bestMinDist = minDist;
      best = bg;
    }
  }

  return best.color;
}

export function resolvePalette(input: unknown): ResolvedPalette {
  try {
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
  } catch (err) {
    console.error("[palettes] resolvePalette failed for input:", JSON.stringify(input), "—", err);
    throw err;
  }
}
