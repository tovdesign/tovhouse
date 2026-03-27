export { colors, TYPO, FONT, SPRING, EASING } from "./tokens";

export const FPS = 30;

// V3 Scene timing — 시공 프로세스 편
export const V3_S1_DUR = 4 * FPS; // Hook
export const V3_S2_START = V3_S1_DUR;
export const V3_S2_DUR = 5 * FPS; // Problem (TypeWriter)
export const V3_S3_START = V3_S2_START + V3_S2_DUR;
export const V3_S3_DUR = 6 * FPS; // Process (ChecklistItem + ProgressBar)
export const V3_S4_START = V3_S3_START + V3_S3_DUR;
export const V3_S4_DUR = 5 * FPS; // Results (BarChart)
export const V3_S5_START = V3_S4_START + V3_S4_DUR;
export const V3_S5_DUR = 4 * FPS; // CTA
export const V3_S6_START = V3_S5_START + V3_S5_DUR;
export const V3_S6_DUR = 3 * FPS; // Ending
export const V3_TOTAL = V3_S6_START + V3_S6_DUR; // 27s
