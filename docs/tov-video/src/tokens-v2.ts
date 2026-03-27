import { Easing } from "remotion";

// Re-export shared tokens from v1
export { colors, TYPO, FONT, SPRING, EASING } from "./tokens";

export const FPS = 30;

// V2 Scene timing — 시공 결과 비교 편
export const V2_S1_DUR = 4 * FPS; // 120f — Hook
export const V2_S2_START = V2_S1_DUR;
export const V2_S2_DUR = 5 * FPS; // 150f — Cost Breakdown (PieChart)
export const V2_S3_START = V2_S2_START + V2_S2_DUR;
export const V2_S3_DUR = 5 * FPS; // 150f — Platform Demo (DeviceFrame)
export const V2_S4_START = V2_S3_START + V2_S3_DUR;
export const V2_S4_DUR = 6 * FPS; // 180f — Before/After
export const V2_S5_START = V2_S4_START + V2_S4_DUR;
export const V2_S5_DUR = 5 * FPS; // 150f — Results
export const V2_S6_START = V2_S5_START + V2_S5_DUR;
export const V2_S6_DUR = 4 * FPS; // 120f — CTA
export const V2_S7_START = V2_S6_START + V2_S6_DUR;
export const V2_S7_DUR = 3 * FPS; // 90f — Ending
export const V2_TOTAL = V2_S7_START + V2_S7_DUR; // 32s total
