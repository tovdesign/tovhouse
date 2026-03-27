import { Easing } from "remotion";

export const colors = {
  brand: {
    900: "#1a1a1a",
    800: "#222222",
    700: "#333333",
    600: "#4a5568",
    500: "#718096",
    400: "#a0aec0",
    300: "#cbd5e0",
  },
  accent: "#7db85e",
  accentDark: "#5a9040",
  accentLight: "#a5d88a",
  danger: "#e53e3e",
  white: "#ffffff",
} as const;

export const TYPO = {
  hero: 130,
  title: 100,
  subtitle: 58,
  body: 42,
  cta: 64,
  caption: 32,
  stat: 180,
} as const;

export const FONT = {
  main: "Pretendard, -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "Montserrat, sans-serif",
} as const;

export const FPS = 30;

export const SPRING = {
  gentle: { damping: 20, stiffness: 120 },
  snappy: { damping: 15, stiffness: 200 },
  bouncy: { damping: 10, stiffness: 100 },
  elastic: { damping: 6, stiffness: 150, mass: 0.6 },
} as const;

export const EASING = {
  smooth: Easing.out(Easing.cubic),
  bouncy: Easing.out(Easing.back(1.5)),
  snappy: Easing.out(Easing.exp),
} as const;

// Scene timing — +1s buffer per scene for content reading time
export const S1_DUR = 5 * FPS; // 150f — Hook (was 4s, +1s buffer)
export const S2_START = S1_DUR;
export const S2_DUR = 5 * FPS; // 150f — Problem (was 4s, +1s buffer)
export const S3_START = S2_START + S2_DUR;
export const S3_DUR = 5 * FPS; // 150f — Solution (same)
export const S4_START = S3_START + S3_DUR;
export const S4_DUR = 7 * FPS; // 210f — Proof (was 6s, +1s for 3 checklist items)
export const S5_START = S4_START + S4_DUR;
export const S5_DUR = 6 * FPS; // 180f — Results (was 5s, +1s buffer)
export const S6_START = S5_START + S5_DUR;
export const S6_DUR = 5 * FPS; // 150f — CTA (was 4s, +1s buffer)
export const S7_START = S6_START + S6_DUR;
export const S7_DUR = 3 * FPS; // 90f — Ending (same)
export const TOTAL_FRAMES = S7_START + S7_DUR; // 36s total
