export interface Style {
  name: string;
  rules: string;
}

export const STYLES: Record<string, Style> = {
  "isometric-tech": {
    name: "Isometric Tech",
    rules:
      "3D isometric perspective. Clean geometric shapes. Tech/digital objects as polished 3D icons. Soft directional lighting from top-left. Subtle shadows. Vibrant professional palette with blues and purples.",
  },
  "floating-ui": {
    name: "Floating UI",
    rules:
      "UI cards, screens, and interface elements floating at slight angles in 3D space. Glassmorphism with frosted translucency. Soft glows and reflections. Modern SaaS aesthetic. Cool-toned gradients.",
  },
  "clay-3d": {
    name: "Clay 3D",
    rules:
      "Soft matte clay/plastic material. Rounded bubbly shapes. Pastel colors. Playful and approachable. Gentle ambient occlusion shadows. Objects look tactile and squeezable.",
  },
  "flat-geometric": {
    name: "Flat Geometric",
    rules:
      "Bold flat illustration. Simple geometric shapes. Limited palette (4-5 colors). No gradients or 3D. Clean vector-art look. Strong silhouettes. Modern editorial illustration.",
  },
  "neon-dark": {
    name: "Neon Dark",
    rules:
      "Dark scene with vibrant neon glowing edges. Cyberpunk-inspired. Objects emit colored light. High contrast. Electric blues, magentas, teals. Cinematic feel.",
  },
  "isometric-flat": {
    name: "Isometric Flat",
    rules:
      "Isometric perspective with flat illustration style. No gradients or realistic lighting. Clean vector shapes with solid fills. Limited color palette. Crisp edges, no shadows. Technical diagram meets modern infographic.",
  },
};

export const VALID_STYLE_IDS = Object.keys(STYLES);
