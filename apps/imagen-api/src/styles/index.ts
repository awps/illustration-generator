export type Palette = string[];

export function buildPrompt<K extends string>(keys: K[], keywords: Record<K, string>, label: string): string {
  return `${label}: ${keys.map(k => keywords[k]).join(", ")}.`;
}

// --- Renderings ---

export const RENDERING_KEYWORDS = {
  flat: "clean flat color fills, no outlines, rounded soft shapes, 2D",
  bold: "bold heavy shapes, strong visual weight, thick prominent forms",
  geometric: "sharp angular shapes, structured mathematical forms",
  lineart: "single-weight line illustration, elegant stroked forms",
  clay: "claymorphism style, soft extruded shapes, subtle shadows, tactile feel",
  "3d": "volumetric 3D-rendered shapes, soft lighting, depth and perspective",
  handdrawn: "sketchy organic lines, imperfect hand-drawn strokes, natural feel",
  isometric: "isometric projection, technical 3D-on-2D grid, structured depth",
  gradient: "smooth color gradients, mesh-gradient fills, modern blended surfaces",
  watercolor: "soft painterly washes, organic color bleeding, textured edges",
  pixel: "pixel art, chunky grid-aligned shapes, retro gaming aesthetic",
  cubist: "abstract deconstructed forms, multiple perspectives, fragmented geometric planes",
  risograph: "grainy risograph print texture, limited ink colors, visible grain and stamp-like fills, bold exaggerated forms",
  doodle: "loose quick doodle sketches, scribbly line work, monochrome fills with sparse color accents, cartoonish exaggerated proportions",
};
export type Rendering = keyof typeof RENDERING_KEYWORDS;

// --- Elements ---

export const ELEMENT_KEYWORDS = {
  cards: "1–2 white rounded UI cards with content sections",
  character: "one friendly simplified character with minimal features interacting with subject",
  object: "one product device as central figure — a laptop, phone, tablet, or symbolic object",
  icons: "2–3 iconic symbolic objects, simple recognizable forms",
  browser: "one browser window frame with dark top bar, navigation dots (red, yellow, green), URL bar",
  badges: "1–2 small floating benefit badges with a checkmark icon",
  cursors: "one single pointer or hand cursor indicating interactivity",
  arrows: "directional connector arrows showing relationships between elements",
  pills: "rounded placeholder pills for abstracted text within cards — use a very light tint of the palette's primary color instead of grey",
  charts: "one data chart or graph visualization",
  tables: "one data table with rows, columns, and status indicators",
};
export type IllustrationElement = keyof typeof ELEMENT_KEYWORDS;

// --- Compositions ---

export const COMPOSITION_KEYWORDS = {
  flow: "multi-step sequential process, elements connected in progression order",
  orbit: "central hub element with satellite elements in circular orbit, connector lines",
  showcase: "product demo presentation, overlapping panels at slight offsets",
  abstract: "single clear visual metaphor, conceptual, not literal representation",
  collection: "curated set of related items in balanced arrangement",
  diagram: "explanatory visual with labeled parts and connections",
  split: "side-by-side panels, comparison or input/output view",
  editorial: "conceptual editorial design, bold composition, magazine-ready",
};
export type Composition = keyof typeof COMPOSITION_KEYWORDS;

// --- Moods ---

export const MOOD_KEYWORDS = {
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
export type Mood = keyof typeof MOOD_KEYWORDS;

// --- Complexities ---

export const COMPLEXITY_KEYWORDS = {
  single: "only one central element, simple composition",
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
export type Complexity = keyof typeof COMPLEXITY_KEYWORDS;

// --- Layouts ---

export const LAYOUT_KEYWORDS = {
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
export type Layout = keyof typeof LAYOUT_KEYWORDS;

// --- Subjects ---

export const SUBJECT_KEYWORDS = {
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
  management: "management, admin page, organizational tools",
};
export type Subject = keyof typeof SUBJECT_KEYWORDS;

// --- Icon Styles ---

export const ICON_STYLE_KEYWORDS = {
  outlined: "outlined, stroke-style icons",
  filled: "solid filled icons",
  minimal: "ultra-minimal, basic geometric shapes only",
  rounded: "rounded, soft-cornered icons",
  sharp: "sharp, crisp-edged icons",
  thin: "thin, lightweight stroke icons",
  bold: "bold, heavy-weight icons",
  duotone: "duotone, two-tone colored icons",
};
export type IconStyle = keyof typeof ICON_STYLE_KEYWORDS;

// --- Placements ---

export const PLACEMENT_KEYWORDS = {
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
export type Placement = keyof typeof PLACEMENT_KEYWORDS;