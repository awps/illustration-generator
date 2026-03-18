# Sub-project 4: Image Composer — Editor UI

## Problem

Generated illustrations are transparent PNGs. Users need to compose them into final images with background gradients, text overlays, and specific dimensions for blog headers, social posts, thumbnails, etc. The composer is a client-side canvas editor using FabricJS.

## Route

`/projects/:projectId/generations/:generationId/compose`

Clicking an illustration in the project grid navigates here.

## Canvas

FabricJS canvas renders three layer types:
- **Background**: a full-canvas rectangle with a linear or radial gradient (user picks colors, direction, type)
- **Illustration**: the transparent PNG loaded from R2, placed as a FabricJS Image object — draggable, resizable, rotatable
- **Text blocks**: zero or more FabricJS Text objects — each draggable, resizable, with font/size/color/weight controls

The canvas dimensions match the selected template (e.g., 1200×630 for blog header). The canvas scales to fit the viewport while maintaining aspect ratio.

## Sidebar Controls (left sidebar)

The compose page replaces the generator form in the sidebar with compose-specific controls:

### 1. Template Picker

Predefined size presets:
- Blog Header: 1200×630
- Social Square: 1080×1080
- Feature Image: 800×450
- Thumbnail: 512×512
- Custom: user enters width × height

Selecting a template resizes the canvas. The illustration and text objects stay on canvas and can be repositioned.

### 2. Background Gradient

- Type toggle: linear / radial
- Direction: angle slider (0–360° for linear), position selector for radial
- Color stops: 2 color pickers (start + end), option to add a third
- Gradient presets: 6–8 pre-made gradients for quick selection

### 3. Text Blocks

- "Add Text" button creates a new text object on the canvas
- Each text block shows controls:
  - Font family (Inter, system-ui, Georgia, monospace — small curated list)
  - Font size (slider or input, 12–120px)
  - Color picker
  - Bold / Italic toggles
  - Delete button
- Text content is edited inline by double-clicking on the canvas (FabricJS built-in)
- Selected text block's controls highlight in the sidebar

### 4. Export (sticky bottom)

- "Download PNG" button
- Uses `canvas.toDataURL('image/png')` at full template resolution
- Filename: `{project-name}-{generationId-short}.png`

## Data Flow

- **No server persistence** for compositions in v1 — stateless tool
- The generation's transparent image URL is derived from `storagePath` + `IMAGES_DOMAIN`
- All editing happens client-side via FabricJS
- Export is entirely in-browser

## Files

### Create

- `apps/app/src/app/pages/compose.tsx` — editor page layout (sidebar + canvas)
- `apps/app/src/app/components/compose/canvas-editor.tsx` — FabricJS canvas wrapper with React ref
- `apps/app/src/app/components/compose/template-picker.tsx` — size preset selector
- `apps/app/src/app/components/compose/gradient-controls.tsx` — background gradient UI
- `apps/app/src/app/components/compose/text-controls.tsx` — text block management
- `apps/app/src/app/lib/compose-templates.ts` — template size definitions and gradient presets

### Modify

- `apps/app/src/app/App.tsx` — add route for compose page
- `apps/app/src/app/pages/project-dashboard.tsx` — make grid cards clickable → navigate to compose
- `apps/app/package.json` — add `fabric` dependency

## Dependencies

- `fabric` (v6) — canvas manipulation, image/text objects, gradient, export
