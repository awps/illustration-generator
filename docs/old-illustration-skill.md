---
name: product-illustration
description: Use when creating product feature illustrations for WordPress plugin or SaaS product websites. Generates HTML/CSS illustrations that visualize product features to accompany marketing copy. Triggers include requests to create feature illustrations, product visuals, integration graphics, workflow diagrams, or conceptual feature art.
metadata:
  tags: illustration, product, feature, wordpress, saas, html, css, marketing, visual
---

# Product Feature Illustration Generator

## Overview

This skill generates **HTML/CSS product feature illustrations** — the kind used on WordPress plugin and SaaS product websites to visually communicate a feature alongside marketing copy. Output is a single self-contained HTML file that can be opened in any browser, screenshotted, and handed to designers for refinement.

**What these illustrations are:** Simplified, stylized visual compositions that communicate a product feature's core idea. They are NOT full UI mockups or detailed screenshots — they distill the key concept into a clean, scannable visual.

**Reference products:** AIOSEO, WPForms, WPChat, and similar WordPress plugin marketing sites.

## When to Use

- User wants to create a feature illustration for a product page
- User needs a visual to accompany feature marketing copy
- User mentions "product illustration," "feature visual," "integration graphic," "workflow illustration"
- User wants to visualize how a feature works for a landing page

## Phase 1: Information Gathering

Gather info in **two steps** — a quick AskUserQuestion for multiple-choice items, then a conversational follow-up for free-form input (colors, feature details). Skip questions the user has already answered.

### Step 1: AskUserQuestion (multiple-choice only)

Use a **single AskUserQuestion call** with up to 3 questions. Only include questions the user hasn't already answered:

**Question A — Illustration Type:**

| Type | Description | Good For |
|------|-------------|----------|
| **UI Showcase** | Show a product interface/screen on an elevated card | Form builders, dashboards, editors, settings panels |
| **Workflow/Process** | Show steps connected by arrows | Multi-step features, automation, content pipelines |
| **Integration/Orbit** | Logo in center with connected services around it | Integrations, compatibility, ecosystem features |
| **Conceptual** | Abstract representation of a feature idea | Security, speed, customization, abstract benefits |

**Question B — Design Source:**
- **I'll provide a screenshot** — User provides a screenshot of the UI/concept to reference
- **Figma link** — Use Figma MCP tools (`get_screenshot`, `get_design_context`) if available
- **Build from scratch** — No existing design, build from the feature description

**Question C — Dimensions:**
- **Standard** (600 x 400) — works well in side-by-side layouts
- **Wide** (1024 x 554) — for prominent feature sections
- **Tall** (700 x 775) — for vertically-oriented compositions
- **Custom** — user specifies width x height

### Step 2: Conversational follow-up

After the AskUserQuestion response, ask the user conversationally for the remaining details. This allows free-form text input for things that don't fit multiple-choice:

> "Now I need a few more details:
> 1. **Brand color** — what's your hex code or Tailwind color name? (e.g., `#005ae0`, `emerald-500`)
> 2. **Feature context** — paste your heading, description/marketing copy, and the ONE key concept to visualize
> 3. **Bullet points** if any (these become floating benefit badges)
> 4. **Icons** — I'll use **Font Awesome 7 Free** (Solid weight) by default (https://fontawesome.com/search?o=r&f=classic&s=solid). Let me know if you'd prefer **Phosphor Icons** instead."

If the user already provided some of these (e.g., mentioned the brand color in their initial message), skip those and only ask for what's missing.

### Design source notes

When a screenshot or Figma design is provided, **remake it** into simplified illustration elements:
- Replace secondary body text with grey pills
- Replace numbers/small details with small grey pills
- Keep key UI elements that communicate the feature (see Text vs Pills Guide below)
- Maintain the general layout structure but simplify aggressively
- Focus on the specific area of the UI relevant to the feature

**Important — Refine source UI labels:** When working from a screenshot, proactively ask: *"Are there any labels, titles, or terminology in the source UI that should be improved for the illustration?"* Source UIs often have developer-facing or placeholder labels that need polish for marketing context (e.g., "Spam vs Legitimate" → "Spam Detection").

---

## Phase 2: Design Principles

### Core Visual Language

These illustrations share a consistent visual language across all types:

1. **Soft solid colored background** — light tint of the brand color (50 or 100 level in Tailwind scale). No gradients on the container.
2. **White elevated elements** — cards, circles, pills float on the background with subtle shadows
3. **Minimal detail** — communicate the idea, not every pixel of UI
4. **Grey pills** for simplified text content (see Grey Pill System)
5. **Dashed lines/circles** for connections, orbits, and relationships
6. **Placeholders** for logos, icons, and images that need specific assets
7. **Benefit badges** — small pills extracted from the feature's bullet points
8. **Cursor hints** — pointer/hand cursor SVG where interactivity is implied

### Shadow System

```css
/* Standard card shadow */
box-shadow: 0 2px 16px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03);

/* Elevated/center element shadow */
box-shadow: 0 4px 32px rgba(BRAND_R, BRAND_G, BRAND_B, 0.12), 0 1px 4px rgba(0,0,0,0.04);
```

### Border Radius

- Illustration container: `20px`
- Cards/panels: `16px`
- Circles: `50%`
- Small pills/badges: `999px` (full round)
- Input fields/small rects: `8px`

### Grey Pill System

Replace secondary text content with grey rounded rectangles to simplify UI:

| Element | Width | Height | Color | Radius |
|---------|-------|--------|-------|--------|
| Heading pill | 120-180px | 14px | `#d1d5db` | 7px |
| Body text pill | 80-200px (vary widths for realism) | 10px | `#e5e7eb` | 5px |
| Label pill | 40-70px | 8px | `#e5e7eb` | 4px |
| Number pill | 24-36px | 8px | `#d1d5db` | 4px |
| Button pill | 80-120px | 32px | brand color at 20% opacity | 6px |

Stack multiple body text pills with 6-8px gaps to represent paragraphs. Vary widths so the last pill in a group is shorter (like real text).

### Text vs Pills Guide

Not everything should be a pill. Use this hierarchy to decide what gets real text vs grey pills:

| Content Type | Treatment | Examples |
|-------------|-----------|---------|
| **Section titles / headings** | Always real text | "Analytics", "Spam Detection (Last 7 Days)" |
| **Column headers** | Always real text | "Date", "Email", "Message", "Result", "Risk" |
| **Status labels / indicators** | Always real text + color | "Clean" (green), "Spam" (red), "High" / "Low" |
| **Identifiers (emails, names, URLs)** | Real text — these communicate what the feature *does* | "john@company.co", "sara@email.com" |
| **Messages / descriptions** | Truncated real text or pills — either works | "Inquiry about pricing..." or grey pill |
| **Dates, timestamps** | Grey pills | — |
| **Long body paragraphs** | Grey pills (stacked, varying widths) | — |
| **Numbers / small metadata** | Grey pills | — |

**Rule of thumb:** If the text helps the viewer understand *what the product does*, use real text. If it's just filling space, use a pill.

### Color Derivation (when no brand color specified)

Pick a background color based on the feature's semantic meaning:

| Feature Theme | Background | Accent |
|---------------|------------|--------|
| Security, trust, compliance | Light green (`#ecfdf5`) | Emerald/green |
| Speed, performance, SEO | Light blue (`#eff6ff`) | Blue |
| Integrations, connections | Light pink (`#fdf2f8`) | Pink/rose |
| AI, automation, smart features | Light purple (`#f5f3ff`) | Purple/violet |
| Forms, data, organization | Light amber (`#fffbeb`) | Amber/orange |
| Communication, chat, support | Light cyan (`#ecfeff`) | Cyan/teal |
| Content, editing, publishing | Light blue (`#eff6ff`) | Blue |
| Analytics, tracking, growth | Light indigo (`#eef2ff`) | Indigo |
| Customization, design, themes | Light rose (`#fff1f2`) | Rose |
| Translation, global, multilingual | Light amber/orange (`#fff7ed`) | Orange |

When using Tailwind color names, use the full scale: 50 for backgrounds, 100-200 for decorative elements, 500-600 for accents, 800 for text on brand.

---

## Phase 3: Composition Guidelines Per Type

### Type 1: UI Showcase

**Purpose:** Show a simplified version of the product's interface focused on one feature.

**Composition:**
- Colored background container
- One or two white cards representing UI panels (e.g., sidebar + main content)
- Key UI elements rendered with real text (headings, important labels)
- Secondary content replaced with grey pills
- Optional: floating feature badges at the top or side
- Optional: cursor icon pointing at the key interaction
- Optional: dashed selection/highlight border around the focal element

**When a design is provided (screenshot/Figma):**
1. Identify the key area of the UI that communicates the feature
2. Crop mentally to just that area — don't try to show the full screen
3. Rebuild it in HTML/CSS with simplified elements
4. Keep important text (feature names, key labels) but pill-ify everything else
5. Add a subtle highlight (dashed border, glow, or badge) on the focal element

**HTML structure pattern:**
```html
<div class="illustration"> <!-- colored bg -->
  <div class="ui-card"> <!-- white card, rounded, shadow -->
    <div class="ui-header">Feature Name</div>
    <div class="ui-content">
      <!-- Mix of real labels and grey pills -->
    </div>
  </div>
  <div class="badge">Feature Benefit</div>
  <div class="cursor-hint"><!-- SVG pointer --></div>
</div>
```

### Type 2: Workflow/Process

**Purpose:** Show a multi-step process with cards connected by arrows.

**Composition:**
- Colored background
- 2-5 white cards arranged vertically or in a flow
- Dashed or solid arrows connecting the cards (use SVG or CSS borders)
- Each card has an icon placeholder + a label
- Optional: a result/output element at the end (e.g., "Publish" button, success state)
- Optional: a website preview card showing the end result

**Arrow styles:**
```css
/* Solid arrow line */
border-left: 2px solid var(--brand-400);

/* Dashed arrow/connection */
border-left: 2px dashed var(--brand-300);

/* Or use an SVG arrow */
```

**Layout pattern:** Vertical flow (top to bottom) or L-shaped flow. Keep it simple — avoid complex branching unless the feature specifically demands it.

### Type 3: Integration/Orbit

**Purpose:** Show a central product connected to multiple services/plugins.

**Composition:**
- Colored background
- Center: larger white circle with product logo placeholder
- Orbit: white circles arranged in a hex/circular pattern around center
- Each orbit circle contains a logo (use actual images if provided, grey placeholders if not)
- Dashed orbit ring(s) passing through the circles
- Dashed connector lines from center to each item
- Optional: subtle decorative dots on the orbit rings

**Positioning pattern (6 items, radius R from center):**
```
Top:          (50%, 50% - R)
Top-right:    (50% + 0.866R, 50% - 0.5R)
Bottom-right: (50% + 0.866R, 50% + 0.5R)
Bottom:       (50%, 50% + R)
Bottom-left:  (50% - 0.866R, 50% + 0.5R)
Top-left:     (50% - 0.866R, 50% - 0.5R)
```

Adjust R so the orbit circles visually overlap/sit on the dashed orbit ring. The ring diameter should roughly equal 2R so the ring passes through the center of each circle.

For fewer items, distribute evenly. For more items, use two orbit rings.

### Type 4: Conceptual

**Purpose:** Abstract representation of a feature's core idea. Most creative and varied.

**Composition varies by concept, but common patterns:**

- **"Languages/Options" concept:** White card with a list (flag icons + labels + checkmarks), concentric dashed circles radiating outward suggesting reach/coverage, toggle/switch element, cursor
- **"Security/Protection" concept:** Feature badges floating ("SSL", "GDPR"), a simplified website card underneath, a shield/lock icon overlapping, green tones
- **"SEO/Multi-market" concept:** Stacked URL cards with country flags and metric badges (+12% clicks), staggered diagonally
- **"Customization" concept:** Overlapping cards at slight angles showing variations, a "Customize" button with cursor
- **"Connection/Grid" concept:** Grid of icon circles connected by dashed lines, a central mascot or product icon

**Key principle for conceptual:** Focus on ONE visual metaphor. Don't try to show everything — pick the single most communicative image and build around it. Use floating badges/pills to reinforce the message.

**Card-centric composition (preferred default):** Start with the simplest effective layout — a single centered white card with badges overlapping its edges. This avoids first-draft clutter:
- Center the card with `top: 50%; transform: translateY(-50%)` and left/right margins
- Position badges so they straddle the card border (half on card, half on background)
- Add 2-3 concentric dashed circles behind the card for subtle depth
- Add a radial glow centered behind the card
- Avoid hero circles, taglines, or decorative dots unless specifically needed — start minimal and add on request

---

## Phase 4: Generation

### Output

Generate a single self-contained HTML file with:
- **Font Awesome 7 Free** (Solid weight) via the **JS version** CDN (`js/all.min.js`, not `css/all.min.css`). The JS version auto-replaces `<i>` tags with inline `<svg>` elements, which is critical for Figma export (font-based icons don't transfer). If the user requested Phosphor Icons, use that instead. Do not mix libraries.
- When styling FA icons in CSS, target both `i` and `svg` selectors (e.g., `.badge i, .badge svg { ... }`) since the JS replaces `<i>` with `<svg>` at runtime. Set explicit `width` and `height` alongside `font-size` for consistent sizing.
- Inline CSS (no external dependencies beyond the icon JS)
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif`
- All positioning done with CSS (absolute positioning with calc-based placement)
- Image references use relative paths (same directory as the HTML file)
- File saved in the user's working directory

### HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@7.2.0/js/all.min.js" defer></script>
<title>[Feature Name] Illustration</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: #f9fafb;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  }
  .illustration {
    width: [WIDTH]px;
    height: [HEIGHT]px;
    background: [BG_COLOR]; /* brand-50 */
    border-radius: 20px;
    position: relative;
    overflow: hidden;
  }
  /* ... composition-specific styles ... */
</style>
</head>
<body>
<div class="illustration">
  <!-- Composition elements -->
</div>
</body>
</html>
```

### Default Spacing Values

Use these generous defaults to avoid cramped first drafts:

| Property | Value | Notes |
|----------|-------|-------|
| Card margin from container | **32px** all sides | Ensures enough colored background is visible |
| Card inner padding | **20px 24px** | Top/bottom 20px, left/right 24px |
| Title margin-bottom | **14px** | Space after the main heading |
| Section gaps (chart → table, etc.) | **12-14px** | Breathing room between major sections |
| Table row padding | **5-6px** vertical | Comfortable row height |
| Legend margin | **8px top, 12px bottom** | Space around legend row |

These are starting points — always err on the side of more space. It's easier to tighten spacing than to add it later.

### After Generation

1. **Save the HTML file** to the user's working directory
2. **Open it in the browser** using `open [filepath]` (macOS) so the user can see it immediately

> **STOP — Do NOT present to the user or ask for feedback until you've completed the agent-browser visual check below. Fix any issues FIRST.**

3. **Visual check with agent-browser** — before showing the user, verify the illustration renders correctly:

```bash
# 1. Open the HTML file in agent-browser
agent-browser open "file:///path/to/illustration.html"

# 2. Screenshot for visual inspection
agent-browser screenshot "/tmp/illustration-check.png"

# 3. Close agent-browser
agent-browser close
```

Read the screenshot image and inspect it for:
- **Alignment issues** — are absolutely positioned elements (drop zones, cursors, badges, dragging elements) properly aligned with the form flow elements they relate to?
- **Text clipping** — are any labels, field names, or badge text cut off by overflow or container edges?
- **Icon rendering** — are all Font Awesome icons rendering correctly? (empty squares = font not loaded for that glyph; use inline SVG as fallback)
- **Spacing** — do cards have enough margin from the container? Are form fields evenly spaced?
- **Overlap** — are any elements unintentionally overlapping (e.g., drop zone overlapping a field label)?

If you spot any issues, **fix them before presenting to the user**. This saves a round-trip of feedback. Common fixes:
- Absolute-positioned elements misaligned → use `agent-browser eval` to query `getBoundingClientRect()` of flow elements and recalculate absolute positions
- Icons not rendering → swap to inline SVG
- Text clipped → reduce font-size, increase container width, or add `overflow: visible`

4. **Ask for feedback and export preference** — you MUST use the **AskUserQuestion tool** (not plain text). This ensures the user gets clickable options:

Use a single AskUserQuestion with one question:
- **Question:** "How does this look? Pick an export option, or select Other to request changes."
- **Header:** "Export"
- **multiSelect:** false
- **Options:**
    - **Export as PNG** — "Saves a 2x retina PNG alongside the HTML file"
    - **Send to Figma** — "Converts the illustration into editable Figma layers"
    - **Both PNG + Figma** — "Exports 2x PNG and sends to Figma"
    - **Skip export** — "Just iterate on the design first"

If the user selects Other with feedback text, iterate on the design first, then re-ask the export question with AskUserQuestion again.

5. **Execute the selected export(s):**
    - PNG → follow the **PNG Export** section below
    - Figma → follow the **Figma Export** section below
    - Both → run PNG export first, then Figma export
6. Iterate based on feedback (see Common Iteration Patterns below).

### PNG Export (agent-browser)

Export the illustration as a **2x retina PNG** when the user requests it. Uses `agent-browser` CLI (install: `brew install agent-browser && agent-browser install`).

**Workflow — 4 commands:**
```bash
# 1. Open the HTML file
agent-browser open "file:///path/to/illustration.html"

# 2. Set viewport to 2x the illustration dimensions (e.g., 600x400 → 1200x800)
agent-browser set viewport 1200 800

# 3. Inject CSS to remove body centering, pin illustration top-left, scale 2x
agent-browser eval "document.body.style.cssText='margin:0;padding:0;min-height:auto;background:transparent;overflow:hidden;display:block';var ill=document.querySelector('.illustration');ill.style.transformOrigin='top left';ill.style.transform='scale(2)';ill.style.borderRadius='0';ill.style.position='absolute';ill.style.top='0';ill.style.left='0';'done';"

# 4. Screenshot and close
agent-browser screenshot "/path/to/illustration@2x.png" && agent-browser close
```

**Key details:**
- Viewport must be exactly `WIDTH*2` x `HEIGHT*2` (matching the illustration dimensions × 2)
- The JS injection removes body flex centering (`display:block`), positions illustration at `top:0;left:0`, and applies `scale(2)` from `transform-origin: top left`
- Border radius is removed so the PNG has clean edges (border radius is only for in-browser preview)
- Output filename uses `@2x` suffix convention
- Always verify the output with `sips -g pixelWidth -g pixelHeight` to confirm 2x dimensions

### Placeholders

When specific assets are needed (logos, icons, screenshots), use these placeholder patterns:

**Logo/icon placeholder (circular):**
```html
<div style="width:60px; height:60px; background:white; border-radius:50%; box-shadow:0 2px 16px rgba(0,0,0,0.05); display:flex; justify-content:center; align-items:center;">
  <div style="width:36px; height:36px; background:#f3f4f6; border-radius:8px;"></div>
</div>
```

**Image reference (when user provides files):**
```html
<img src="filename.png" style="width:36px; height:36px; object-fit:contain;" alt="Description">
```

**Screenshot placeholder (for UI showcase):**
```html
<div style="width:300px; height:200px; background:#f9fafb; border-radius:8px; border:1px dashed #d1d5db; display:flex; justify-content:center; align-items:center; font-size:11px; color:#9ca3af;">
  Screenshot: [description]
</div>
```

### Cursor Hints

When showing interactivity, use Font Awesome cursor/hand icons (Solid weight). Style them white with a dark outline and drop shadow for depth — mimicking a real OS cursor floating above the UI.

**Important:** Since FA JS converts `<i>` to inline `<svg>`, use `paint-order: stroke fill` on the SVG `path` elements for the outline (not `-webkit-text-stroke`, which only works on font glyphs).

```css
/* Cursor container */
.cursor-hint {
  position: absolute;
  z-index: 20;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}
.cursor-hint i, .cursor-hint svg {
  font-size: 28px;
  width: 28px;
  height: 28px;
  color: white;
}
/* SVG outline — stroke renders behind fill */
.cursor-hint svg path {
  stroke: #1f2937;
  stroke-width: 30;
  paint-order: stroke fill;
  stroke-linejoin: round;
}
```

```html
<!-- Pointer cursor (default for click hints) -->
<div class="cursor-hint" style="top:[Y]px; left:[X]px;">
  <i class="fa-solid fa-arrow-pointer"></i>
</div>

<!-- Hand pointer (for links/buttons) -->
<div class="cursor-hint" style="top:[Y]px; left:[X]px;">
  <i class="fa-solid fa-hand-pointer"></i>
</div>

<!-- Grab hand (for drag interactions) -->
<div class="cursor-hint" style="top:[Y]px; left:[X]px;">
  <i class="fa-solid fa-hand-back-fist"></i>
</div>
```

### Benefit Badges

Auto-generate from the feature's bullet points. Include by default — user can ask to remove.

```html
<div style="display:inline-flex; align-items:center; gap:6px; background:white; border-radius:999px; padding:6px 14px 6px 8px; box-shadow:0 1px 8px rgba(0,0,0,0.06); font-size:12px; font-weight:600; color:#1f2937;">
  <i class="fa-solid fa-circle-check" style="font-size:16px; color:[BRAND_500];"></i>
  Badge Text
</div>
```

---

## Common Patterns Reference

### Dashed Orbit Ring
```css
.orbit-ring {
  position: absolute;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: 1.5px dashed rgba(BRAND_R, BRAND_G, BRAND_B, 0.25);
  pointer-events: none;
}
```

### Dashed Connector Line (from center outward)
```css
.connector {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: 0 0;
  height: 1px;
  pointer-events: none;
}
.connector::after {
  content: '';
  display: block;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(BRAND_R,BRAND_G,BRAND_B,0.18) 4px, rgba(BRAND_R,BRAND_G,BRAND_B,0.18) 8px);
}
```

### White Floating Card
```css
.card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03);
  padding: 20px 24px;
}
```

### Subtle Background Glow
```css
.bg-glow {
  position: absolute;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  height: 80%;
  background: radial-gradient(circle, rgba(BRAND_R,BRAND_G,BRAND_B,0.08) 0%, transparent 70%);
  pointer-events: none;
}
```

### Concentric Decorative Circles (for conceptual type)
```css
.concentric {
  position: absolute;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: 1.5px dashed rgba(BRAND_R,BRAND_G,BRAND_B, 0.2);
}
/* Create 2-3 at different sizes: 200px, 300px, 400px */
```

---

## Common Iteration Patterns

Anticipate these frequent first-round feedback items and get them right upfront:

| Feedback | What to adjust | Prevention |
|----------|---------------|------------|
| **"Needs more breathing room"** | Increase card margins (32px+), inner padding (20px+ / 24px+), section gaps | Use the Default Spacing Values table — don't go below those minimums |
| **"Bump up the size"** | Increase container dimensions by 40-60px in each direction | Start with generous presets (600x400 standard) |
| **"Show actual data"** | Swap grey pills for real text on identifiers (emails, names, URLs) | Follow the Text vs Pills Guide — identifiers should default to real text |
| **"Improve the labels"** | Rewrite source UI labels for marketing context | Always ask about label refinement when working from screenshots |
| **"Too cluttered / too many rows"** | Remove 1-2 table rows, simplify chart, reduce badges | For Standard size: max 4 table rows, max 7 chart bars, max 2 badges |
| **"Change badge text"** | Update floating badge content | Derive badges from the marketing copy's key benefits, not UI labels |

---

## Figma Export

After the illustration is finalized, offer to send it to Figma. This converts the HTML illustration into editable Figma layers.

### Prerequisites

The **Figma MCP server** must be configured in Claude Code. The user needs the remote `figma` MCP server connected — this provides the `generate_figma_design` tool. To check, look for `mcp__figma__generate_figma_design` in available tools.

**If Figma MCP is not available**, tell the user:
> "To send designs to Figma, you need the Figma MCP server connected. Run `/mcp` in Claude Code and add the Figma remote MCP server, or add it to your `.claude/settings.json`:
> ```json
> {
>   "mcpServers": {
>     "figma": {
>       "type": "url",
>       "url": "https://mcp.figma.com/sse"
>     }
>   }
> }
> ```
> Then authenticate with `/mcp` and try again."

### Export Workflow

**Step 1 — Ask the user where to send it:**

Use AskUserQuestion with two options:
- **New Figma file** — creates a standalone file in the user's Figma workspace
- **Existing Figma file** — adds to a file the user specifies (they provide the Figma URL)

**Step 2 — Determine the target:**

- **New file:** Call `generate_figma_design` with `outputMode: "newFile"` and a `fileName`. The first call (without `planKey`) returns available teams — ask the user which team to use, then call again with the selected `planKey`.
- **Existing file:** Extract `fileKey` and optionally `nodeId` from the Figma URL the user provides. The URL format is `https://figma.com/design/:fileKey/:fileName?node-id=:nodeId`. Call `generate_figma_design` with `outputMode: "existingFile"`, the `fileKey`, and optionally the `nodeId`.

**Step 3 — Serve the HTML locally:**

The Figma capture script **cannot work with `file://` URLs** — you must serve via HTTP.

```bash
# 1. Check if a server is already running on port 8080
lsof -i :8080

# 2. If not, start one (run in background)
cd "/path/to/illustration/directory" && npx http-server . -p 8080 -c-1

# 3. Verify it's working
curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/illustration.html"
```

**Step 4 — Add the capture script to the HTML:**

Temporarily inject the Figma capture script into the `<head>` of the HTML file:
```html
<script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async></script>
```

**Step 5 — Open the capture URL:**

The `generate_figma_design` call returns a `captureId`. Use it to build the capture URL:

```bash
open "http://localhost:8080/illustration.html#figmacapture=CAPTURE_ID&figmaendpoint=https%3A%2F%2Fmcp.figma.com%2Fmcp%2Fcapture%2FCAPTURE_ID%2Fsubmit&figmadelay=2000&figmaselector=.illustration"
```

Key parameters:
- `figmadelay=2000` — wait 2s for rendering before capture
- `figmaselector=.illustration` — capture only the illustration container, not the full page

**Step 6 — Poll for completion:**

Wait ~5-6 seconds, then call `generate_figma_design` again with the `captureId` to check status and get the Figma file URL.

```
sleep 6
generate_figma_design(captureId: "CAPTURE_ID")
```

**Step 7 — Clean up and share:**

- Remove the capture script from the HTML file (restore to original)
- Open the Figma URL for the user
- Stop the local HTTP server if no longer needed

### Quick Reference

| Mode | Tool Call |
|------|-----------|
| New file (get teams) | `generate_figma_design(outputMode: "newFile", fileName: "...")` |
| New file (create) | `generate_figma_design(outputMode: "newFile", fileName: "...", planKey: "team::ID")` |
| Existing file | `generate_figma_design(outputMode: "existingFile", fileKey: "...", nodeId: "...")` |
| Poll status | `generate_figma_design(captureId: "...")` |

---

## Quality Checklist

Before delivering the illustration:

- [ ] Illustration communicates the feature's core idea at a glance
- [ ] Background uses a soft tint of the brand color (not white, not too saturated)
- [ ] White elements have consistent shadow and border-radius
- [ ] Text vs Pills Guide followed — identifiers (emails, names) use real text, secondary content uses pills
- [ ] UI labels refined for marketing context (not raw developer-facing terms from the source)
- [ ] Spacing meets or exceeds the Default Spacing Values (card margin 32px+, inner padding 20px/24px+)
- [ ] Specific logos/icons use placeholders or actual provided images
- [ ] The composition has a clear focal point
- [ ] Nothing is clipped awkwardly by the container edges (small overlap is fine for dynamic feel)
- [ ] File is self-contained HTML with inline CSS
- [ ] File opened in browser for user to preview
- [ ] Visual check performed with agent-browser (screenshot reviewed for alignment, clipping, icon rendering)
- [ ] User asked if they want to send the illustration to Figma
