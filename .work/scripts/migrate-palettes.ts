import { createHash, randomUUID } from "crypto";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join, basename } from "path";
import { uuidv7 } from "uuidv7";

const PALETTES_DIR = join(__dirname, "../../apps/imagen-api/src/palletes");

interface PaletteEntry {
  colors: string[];
  totalColors: number;
  predominantColor: string;
  style: string;
  topic: string;
}

function hashColors(colors: string[]): string {
  const normalized = colors.map(c => c.replace(/\s/g, "")).join("-");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 8);
}

// --- Color math ---

function parseRgb(rgb: string): [number, number, number] {
  const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return [0, 0, 0];
  return [+m[1], +m[2], +m[3]];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

interface PaletteStats {
  hsls: [number, number, number][];
  avgH: number;
  avgS: number;
  avgL: number;
  hueSpread: number;
  colorNames: string[];
  colorCounts: Record<string, number>;
  hasColor: (name: string) => boolean;
  colorRatio: (name: string) => number;
  warmRatio: number;
  coldRatio: number;
}

function classifyColor(h: number, s: number, l: number): string {
  if (s < 10) return "gray";
  if ((h <= 45 || h >= 345) && l < 40 && s < 60) return "brown";
  if (h < 15 || h >= 345) return "red";
  if (h < 45) return "orange";
  if (h < 65) return "yellow";
  if (h < 170) return "green";
  if (h < 200) return "turquoise";
  if (h < 260) return "blue";
  if (h < 290) return "violet";
  return "pink";
}

function analyzepalette(colors: string[]): PaletteStats {
  const hsls = colors.map(c => rgbToHsl(...parseRgb(c)));
  const nonGray = hsls.filter(([, s]) => s >= 10);

  const avgS = hsls.reduce((a, [, s]) => a + s, 0) / hsls.length;
  const avgL = hsls.reduce((a, [, , l]) => a + l, 0) / hsls.length;

  // Circular mean for hue (only non-gray)
  let avgH = 0;
  if (nonGray.length > 0) {
    const sinSum = nonGray.reduce((a, [h]) => a + Math.sin(h * Math.PI / 180), 0);
    const cosSum = nonGray.reduce((a, [h]) => a + Math.cos(h * Math.PI / 180), 0);
    avgH = (Math.atan2(sinSum, cosSum) * 180 / Math.PI + 360) % 360;
  }

  // Hue spread — max angular distance between any two non-gray colors
  let hueSpread = 0;
  for (let i = 0; i < nonGray.length; i++) {
    for (let j = i + 1; j < nonGray.length; j++) {
      const diff = Math.abs(nonGray[i][0] - nonGray[j][0]);
      hueSpread = Math.max(hueSpread, Math.min(diff, 360 - diff));
    }
  }

  const colorNames = hsls.map(([h, s, l]) => classifyColor(h, s, l));
  const colorCounts: Record<string, number> = {};
  for (const name of colorNames) {
    colorCounts[name] = (colorCounts[name] || 0) + 1;
  }

  const total = colorNames.length;
  const warmColors = ["red", "orange", "yellow", "brown"];
  const coldColors = ["blue", "turquoise", "violet"];
  const warmCount = colorNames.filter(c => warmColors.includes(c)).length;
  const coldCount = colorNames.filter(c => coldColors.includes(c)).length;

  return {
    hsls,
    avgH,
    avgS,
    avgL,
    hueSpread,
    colorNames,
    colorCounts,
    hasColor: (name: string) => (colorCounts[name] || 0) > 0,
    colorRatio: (name: string) => (colorCounts[name] || 0) / total,
    warmRatio: warmCount / total,
    coldRatio: coldCount / total,
  };
}

// --- Style detection ---

function detectStyle(stats: PaletteStats): string {
  const { avgS, avgL, hueSpread, hsls } = stats;

  // Monochromatic: all non-gray hues within 30 degrees
  const nonGray = hsls.filter(([, s]) => s >= 10);
  if (nonGray.length > 0 && hueSpread < 30) return "monochromatic";

  // Rainbow: wide hue spread, many distinct hue buckets
  const distinctHues = new Set(stats.colorNames.filter(c => c !== "gray"));
  if (hueSpread > 180 && distinctHues.size >= 4) return "rainbow";

  // Gradient: smooth lightness progression
  const sortedL = [...hsls.map(([, , l]) => l)].sort((a, b) => a - b);
  if (hsls.length >= 3) {
    const steps = sortedL.slice(1).map((l, i) => l - sortedL[i]);
    const avgStep = steps.reduce((a, b) => a + b, 0) / steps.length;
    const maxDeviation = Math.max(...steps.map(s => Math.abs(s - avgStep)));
    if (maxDeviation < 8 && sortedL[sortedL.length - 1] - sortedL[0] > 30) return "gradient";
  }

  // Pastel: high lightness, low-to-moderate saturation
  if (avgL > 70 && avgS > 15 && avgS < 60) return "pastel";

  // Dark: low lightness
  if (avgL < 30) return "dark";

  // Bright: high saturation + good lightness
  if (avgS > 55 && avgL > 45 && avgL < 75) return "bright";

  // Vintage/muted: moderate saturation and lightness
  if (avgS > 15 && avgS < 45 && avgL > 30 && avgL < 65) return "vintage";

  // Warm vs cold
  if (stats.warmRatio > 0.6) return "warm";
  if (stats.coldRatio > 0.6) return "cold";

  return "bright"; // default fallback
}

// --- Topic detection ---

function detectTopic(stats: PaletteStats): string {
  const { avgL, avgS, hasColor, colorRatio, warmRatio, coldRatio } = stats;

  // Christmas: has red AND green
  if (hasColor("red") && hasColor("green") && colorRatio("red") > 0.2 && colorRatio("green") > 0.2)
    return "christmas";

  // Halloween: orange + dark/purple/black
  if (hasColor("orange") && avgL < 40 && (hasColor("violet") || colorRatio("gray") > 0.2))
    return "halloween";

  // Space: very dark + blue/violet
  if (avgL < 25 && (hasColor("blue") || hasColor("violet")))
    return "space";

  // Gold: yellow/orange dominant, warm, moderate saturation
  if ((colorRatio("yellow") + colorRatio("orange")) > 0.6 && avgS > 30 && avgS < 70)
    return "gold";

  // Water: blue/turquoise dominant
  if ((colorRatio("blue") + colorRatio("turquoise")) > 0.6)
    return "water";

  // Sunset: has orange/red/pink/violet spread
  if (hasColor("orange") && (hasColor("pink") || hasColor("violet")) && warmRatio > 0.3)
    return "sunset";

  // Nature: green + earth tones (brown/orange)
  if (hasColor("green") && (hasColor("brown") || hasColor("orange")) && colorRatio("green") > 0.3)
    return "nature";

  // Autumn: warm + muted + browns/oranges
  if (warmRatio > 0.5 && avgS < 55 && (hasColor("brown") || hasColor("orange")))
    return "autumn";

  // Spring: pastel + green + pink
  if (avgL > 65 && hasColor("green") && hasColor("pink"))
    return "spring";

  // Winter: cold + light or very desaturated
  if (coldRatio > 0.5 && avgL > 60)
    return "winter";

  // Wedding: pastel, soft pinks/violets
  if (avgL > 70 && avgS < 50 && (hasColor("pink") || hasColor("violet")))
    return "wedding";

  // Kids: high saturation + many distinct colors
  const distinct = new Set(stats.colorNames.filter(c => c !== "gray"));
  if (avgS > 60 && distinct.size >= 3)
    return "kids";

  // Summer: bright + warm
  if (avgS > 45 && avgL > 50 && warmRatio > 0.4)
    return "summer";

  // Happy: bright + diverse
  if (avgS > 50 && avgL > 50)
    return "happy";

  // Food: warm earth tones
  if (warmRatio > 0.5 && avgL < 55)
    return "food";

  return "happy"; // default fallback
}

// --- Predominant color ---

function detectPredominantColor(stats: PaletteStats): string {
  const counts = { ...stats.colorCounts };
  delete counts["gray"];

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return "gray";

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topName, topCount] = sorted[0];
  if (topCount / total > 0.4) return topName;
  return "mixed";
}

// --- Collect palettes ---

// Track file-sourced metadata to prefer it over auto-detection
const fileStyle = new Map<string, string>();
const fileTopic = new Map<string, string>();
const registry = new Map<string, string[]>();

for (const category of ["by-color", "by-style", "by-topic", "by-number"]) {
  const dir = join(PALETTES_DIR, category);
  let files: string[];
  try {
    files = readdirSync(dir).filter(f => f.endsWith(".json"));
  } catch {
    continue;
  }

  for (const file of files) {
    const tag = basename(file, ".json");
    const palettes: string[][] = JSON.parse(readFileSync(join(dir, file), "utf-8"));

    for (const colors of palettes) {
      const id = hashColors(colors);
      registry.set(id, colors);

      if (category === "by-style" && !fileStyle.has(id)) fileStyle.set(id, tag);
      if (category === "by-topic" && !fileTopic.has(id)) fileTopic.set(id, tag);
    }
  }
}

// Build output — compress RGB strings, assign uuidv7 IDs, wrap in { filters, palletes }
const palettes: Record<string, PaletteEntry> = {};
for (const [hash, colors] of registry) {
  const compressed = colors.map(c => c.replace(/\s/g, ""));
  const stats = analyzepalette(colors);
  const id = uuidv7();
  palettes[id] = {
    colors: compressed,
    totalColors: colors.length,
    predominantColor: detectPredominantColor(stats),
    style: fileStyle.get(hash) ?? detectStyle(stats),
    topic: fileTopic.get(hash) ?? detectTopic(stats),
  };
}

// Build filters from distinct values
const allColors = [...new Set(Object.values(palettes).map(p => p.predominantColor))].sort();
const allStyles = [...new Set(Object.values(palettes).map(p => p.style))].sort();
const allTopics = [...new Set(Object.values(palettes).map(p => p.topic))].sort();
const allCounts = [...new Set(Object.values(palettes).map(p => p.totalColors))].sort((a, b) => a - b);

const output = {
  filters: {
    predominantColor: allColors,
    style: allStyles,
    topic: allTopics,
    totalColors: allCounts,
  },
  palletes: palettes,
};

const outPath = join(__dirname, "../../apps/api/src/palettes.json");
writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");

console.log(`Wrote ${Object.keys(palettes).length} palettes to ${outPath}`);

// Stats
const styleCounts: Record<string, number> = {};
const topicCounts: Record<string, number> = {};
const colorCounts: Record<string, number> = {};
for (const entry of Object.values(palettes)) {
  styleCounts[entry.style] = (styleCounts[entry.style] || 0) + 1;
  topicCounts[entry.topic] = (topicCounts[entry.topic] || 0) + 1;
  colorCounts[entry.predominantColor] = (colorCounts[entry.predominantColor] || 0) + 1;
}
console.log("Colors:", colorCounts);
console.log("Styles:", styleCounts);
console.log("Topics:", topicCounts);