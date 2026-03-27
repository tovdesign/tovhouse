import { AbsoluteFill, Sequence } from "remotion";
import { GradientSweep } from "./primitives";
import { V2Scene1Hook } from "./scenes-v2/V2Scene1Hook";
import { V2Scene2CostBreakdown } from "./scenes-v2/V2Scene2CostBreakdown";
import { V2Scene3Platform } from "./scenes-v2/V2Scene3Platform";
import { V2Scene4BeforeAfter } from "./scenes-v2/V2Scene4BeforeAfter";
import { V2Scene5Results } from "./scenes-v2/V2Scene5Results";
import { V2Scene6CTA } from "./scenes-v2/V2Scene6CTA";
import { V2Scene7Ending } from "./scenes-v2/V2Scene7Ending";
import {
  colors,
  V2_S1_DUR,
  V2_S2_START,
  V2_S2_DUR,
  V2_S3_START,
  V2_S3_DUR,
  V2_S4_START,
  V2_S4_DUR,
  V2_S5_START,
  V2_S5_DUR,
  V2_S6_START,
  V2_S6_DUR,
  V2_S7_START,
  V2_S7_DUR,
} from "./tokens-v2";

const S1_START = 0;

export const TovShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.brand[900] }}>
      {/* S1 — Hook: Stat Shock */}
      <Sequence from={S1_START} durationInFrames={V2_S1_DUR}>
        <V2Scene1Hook durationInFrames={V2_S1_DUR} />
      </Sequence>

      {/* Transition: S1→S2 */}
      <Sequence from={V2_S2_START - 4} durationInFrames={12}>
        <GradientSweep delay={0} color={colors.brand[700]} angle={90} />
      </Sequence>

      {/* S2 — Cost Breakdown: PieChart */}
      <Sequence from={V2_S2_START} durationInFrames={V2_S2_DUR}>
        <V2Scene2CostBreakdown durationInFrames={V2_S2_DUR} />
      </Sequence>

      {/* Transition: S2→S3 */}
      <Sequence from={V2_S3_START - 4} durationInFrames={12}>
        <GradientSweep delay={0} color={colors.accentDark} angle={135} />
      </Sequence>

      {/* S3 — Platform: DeviceFrame */}
      <Sequence from={V2_S3_START} durationInFrames={V2_S3_DUR}>
        <V2Scene3Platform durationInFrames={V2_S3_DUR} />
      </Sequence>

      {/* Transition: S3→S4 */}
      <Sequence from={V2_S4_START - 4} durationInFrames={12}>
        <GradientSweep delay={0} color={colors.brand[800]} angle={-45} />
      </Sequence>

      {/* S4 — Before/After */}
      <Sequence from={V2_S4_START} durationInFrames={V2_S4_DUR}>
        <V2Scene4BeforeAfter durationInFrames={V2_S4_DUR} />
      </Sequence>

      {/* Transition: S4→S5 */}
      <Sequence from={V2_S5_START - 4} durationInFrames={12}>
        <GradientSweep delay={0} color={colors.accent} angle={0} />
      </Sequence>

      {/* S5 — Results: Stats */}
      <Sequence from={V2_S5_START} durationInFrames={V2_S5_DUR}>
        <V2Scene5Results durationInFrames={V2_S5_DUR} />
      </Sequence>

      {/* Transition: S5→S6 */}
      <Sequence from={V2_S6_START - 4} durationInFrames={12}>
        <GradientSweep delay={0} color={colors.accentDark} angle={135} />
      </Sequence>

      {/* S6 — CTA */}
      <Sequence from={V2_S6_START} durationInFrames={V2_S6_DUR}>
        <V2Scene6CTA durationInFrames={V2_S6_DUR} />
      </Sequence>

      {/* S7 — Ending */}
      <Sequence from={V2_S7_START} durationInFrames={V2_S7_DUR}>
        <V2Scene7Ending durationInFrames={V2_S7_DUR} />
      </Sequence>
    </AbsoluteFill>
  );
};
