export type Palette = string[];

import palettes from "../palletes/violet.json";
export const PALETTES: Palette[] = palettes;

export const RENDERINGS = [
  "flat", "bold", "geometric", "editorial", "lineart", "infographic",
] as const;
export type Rendering = (typeof RENDERINGS)[number];

export const RENDERING_KEYWORDS: Record<Rendering, string> = {
  flat: "clean flat color fills, no outlines, rounded soft shapes, 2D",
  bold: "bold heavy shapes, strong visual weight, thick prominent forms",
  geometric: "sharp angular shapes, structured mathematical forms",
  editorial: "conceptual editorial design, bold composition, magazine-ready",
  lineart: "single-weight line illustration, elegant stroked forms",
  infographic: "information design aesthetic, clear visual hierarchy, diagram-friendly",
};

export function buildRenderingPrompt(renderings: Rendering[]): string {
  const keywords = renderings.map(r => RENDERING_KEYWORDS[r]).join(", ");
  return `Rendering style: ${keywords}.`;
}

export const ELEMENTS = [
  "cards", "character", "object", "icons", "browser",
  "badges", "cursors", "arrows", "pills", "charts", "tables",
] as const;
export type IllustrationElement = (typeof ELEMENTS)[number];

export const ELEMENT_KEYWORDS: Record<IllustrationElement, string> = {
  cards: "white rounded UI cards/panels with content sections",
  character: "friendly simplified character with minimal features interacting with subject",
  object: "product device as central figure — laptop, phone, tablet, or symbolic object",
  icons: "iconic symbolic objects, simple recognizable forms",
  browser: "browser window frame with dark top bar, navigation dots, URL bar",
  badges: "small floating benefit/status badges with checkmark icons",
  cursors: "pointer or hand cursor hints indicating interactivity",
  arrows: "directional connectors — dashed or solid arrows showing relationships",
  pills: "grey rounded placeholder pills for abstracted text content",
  charts: "data charts, graphs, metric visualizations",
  tables: "data tables with rows, columns, and status indicators",
};

export function buildElementPrompt(elements: IllustrationElement[]): string {
  const keywords = elements.map(e => ELEMENT_KEYWORDS[e]).join(", ");
  return `Visual elements: ${keywords}.`;
}

export const COMPOSITIONS = [
  "flow", "orbit", "showcase", "abstract", "collection", "diagram", "split",
] as const;
export type Composition = (typeof COMPOSITIONS)[number];

export const COMPOSITION_KEYWORDS: Record<Composition, string> = {
  flow: "multi-step sequential process, elements connected in progression order",
  orbit: "central hub element with satellite elements in circular orbit, connector lines",
  showcase: "product demo presentation, overlapping panels at slight offsets",
  abstract: "single clear visual metaphor, conceptual, not literal representation",
  collection: "curated set of related items in balanced arrangement",
  diagram: "explanatory visual with labeled parts and connections",
  split: "side-by-side panels, comparison or input/output view",
};

export function buildCompositionPrompt(compositions: Composition[]): string {
  const keywords = compositions.map(c => COMPOSITION_KEYWORDS[c]).join(", ");
  return `Scene composition: ${keywords}.`;
}

export const MOODS = [
  "professional", "playful", "techy", "friendly",
  "polished", "corporate", "clean", "authoritative",
  "energetic", "fun", "lively", "approachable",
  "technical", "modern", "precise", "warm", "inviting",
] as const;
export type Mood = (typeof MOODS)[number];

export const COMPLEXITIES = [
  "few", "several", "many",
  "spacious", "balanced", "dense",
  "simple", "refined", "intricate",
  "sparse", "informative", "decorated", "bare",
] as const;
export type Complexity = (typeof COMPLEXITIES)[number];

export const LAYOUTS = [
  "centered", "offset", "left", "right",
  "horizontal", "vertical", "diagonal",
  "stacked", "grouped", "grid",
  "symmetric", "asymmetric",
  "overlapping", "spread", "tight", "layered",
] as const;
export type Layout = (typeof LAYOUTS)[number];

export const SUBJECTS = [
  "dashboard", "form", "email", "analytics", "settings",
  "integration", "security", "payment", "editor", "chat",
  "website", "mobile", "wordpress",
] as const;
export type Subject = (typeof SUBJECTS)[number];

export const ICON_STYLES = [
  "outlined", "filled", "minimal", "rounded",
  "sharp", "thin", "bold", "duotone",
] as const;
export type IconStyle = (typeof ICON_STYLES)[number];

export const PLACEMENTS = [
  "hero", "feature", "section", "blog", "header",
  "card", "thumbnail", "onboarding", "empty", "state",
] as const;
export type Placement = (typeof PLACEMENTS)[number];

export const MOOD_KEYWORDS: Record<Mood, string> = {
  professional: "professional, polished",
  playful: "playful, fun, rounded shapes",
  techy: "technical, developer-oriented aesthetic",
  friendly: "friendly, approachable, human",
  polished: "polished, refined, high-end feel",
  corporate: "corporate-friendly, business-appropriate",
  clean: "clean, crisp, uncluttered",
  authoritative: "authoritative, confident, trustworthy",
  energetic: "energetic, dynamic, high-energy",
  fun: "fun, cheerful, lighthearted",
  lively: "lively, vibrant, animated feel",
  approachable: "approachable, inviting, easy-going",
  technical: "technical, precise, geometric elements",
  modern: "modern, contemporary, current",
  precise: "precise, exact, meticulous detail",
  warm: "warm, soft shapes, comforting",
  inviting: "inviting, welcoming, draws you in",
};

export function buildMoodPrompt(moods: Mood[]): string {
  const keywords = moods.map(m => MOOD_KEYWORDS[m]).join(", ");
  return `The illustration mood is: ${keywords}.`;
}

export const COMPLEXITY_KEYWORDS: Record<Complexity, string> = {
  few: "only 1-2 key elements",
  several: "3-4 elements",
  many: "5+ elements",
  spacious: "lots of whitespace, breathing room",
  balanced: "even whitespace-to-content ratio",
  dense: "tightly packed, compact",
  simple: "basic shapes, no fine detail",
  refined: "polished details, subtle touches",
  intricate: "rich fine detail, elaborate",
  sparse: "very little content, stripped back",
  informative: "data-rich, explanatory, content-heavy",
  decorated: "accent shapes, ornamental touches",
  bare: "absolute essentials only, nothing extra",
};

export function buildComplexityPrompt(complexities: Complexity[]): string {
  const keywords = complexities.map(c => COMPLEXITY_KEYWORDS[c]).join(", ");
  return `Composition complexity: ${keywords}.`;
}

export const LAYOUT_KEYWORDS: Record<Layout, string> = {
  centered: "main element in the middle",
  offset: "main element shifted to one side",
  left: "visual weight on the left",
  right: "visual weight on the right",
  horizontal: "elements flow left-to-right",
  vertical: "elements flow top-to-bottom",
  diagonal: "elements along a diagonal",
  stacked: "elements layered on top of each other",
  grouped: "elements clustered together",
  grid: "structured grid arrangement",
  symmetric: "mirror-balanced composition",
  asymmetric: "intentionally unbalanced composition",
  overlapping: "elements overlap each other",
  spread: "elements spaced far apart",
  tight: "elements close together",
  layered: "depth layers, front and back",
};

export function buildLayoutPrompt(layouts: Layout[]): string {
  const keywords = layouts.map(l => LAYOUT_KEYWORDS[l]).join(", ");
  return `Layout: ${keywords}.`;
}

export const SUBJECT_KEYWORDS: Record<Subject, string> = {
  dashboard: "data dashboard, charts, metrics, KPI cards",
  form: "form builder, input fields, labels, submit actions",
  email: "email, inboxes, messages, notifications, campaigns",
  analytics: "analytics, graphs, trends, data visualization, reports",
  settings: "settings, configuration, toggles, preferences, control panels",
  integration: "integrations, connecting services, APIs, third-party tools",
  security: "security, locks, shields, authentication, protection",
  payment: "payments, transactions, invoices, pricing, checkout",
  editor: "content editor, text editing, rich media, WYSIWYG, publishing",
  chat: "chat, messaging, conversations, support, real-time communication",
  website: "website, landing pages, blogs, portfolios, online presence",
  mobile: "mobile apps, smartphones, app interfaces, on-the-go usage",
  wordpress: "WordPress, themes, plugins, blogging, website building",
};

export function buildSubjectPrompt(subjects: Subject[]): string {
  const keywords = subjects.map(s => SUBJECT_KEYWORDS[s]).join(", ");
  return `The subject context is: ${keywords}.`;
}

export const ICON_STYLE_KEYWORDS: Record<IconStyle, string> = {
  outlined: "outlined, stroke-style icons",
  filled: "solid filled icons",
  minimal: "ultra-minimal, basic geometric shapes only",
  rounded: "rounded, soft-cornered icons",
  sharp: "sharp, crisp-edged icons",
  thin: "thin, lightweight stroke icons",
  bold: "bold, heavy-weight icons",
  duotone: "duotone, two-tone colored icons",
};

export function buildIconStylePrompt(iconStyles: IconStyle[]): string {
  const keywords = iconStyles.map(i => ICON_STYLE_KEYWORDS[i]).join(", ");
  return `Icon style: ${keywords}.`;
}

export const PLACEMENT_KEYWORDS: Record<Placement, string> = {
  hero: "bold, eye-catching, large visual weight, strong focal point",
  feature: "medium visual weight, clear and explanatory, supports adjacent text",
  section: "inline section element, balanced with surrounding content",
  blog: "wide composition, decorative but not overpowering, sets the topic mood",
  header: "top-of-page banner, prominent, sets the visual tone",
  card: "compact, readable at small size, one clear focal element, no fine details",
  thumbnail: "very small, simplified, instantly recognizable at a glance",
  onboarding: "welcoming, guiding, clear single concept, encouraging",
  empty: "minimal, friendly, subtle, lightweight, not attention-grabbing",
  state: "represents a current condition or status, informational",
};

export function buildPlacementPrompt(placements: Placement[]): string {
  const keywords = placements.map(p => PLACEMENT_KEYWORDS[p]).join(", ");
  return `The image placement context is: ${keywords}.`;
}
