import { AbsoluteFill, Sequence } from "remotion";
import { GradientSweep } from "./primitives";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene2Reality } from "./scenes/Scene2Reality";
import { Scene3Solution } from "./scenes/Scene3Solution";
import { Scene4Proof } from "./scenes/Scene4Proof";
import { Scene5Results } from "./scenes/Scene5Results";
import { Scene6CTA } from "./scenes/Scene6CTA";
import { Scene7Ending } from "./scenes/Scene7Ending";
import {
  colors,
  S1_DUR,
  S2_START,
  S2_DUR,
  S3_START,
  S3_DUR,
  S4_START,
  S4_DUR,
  S5_START,
  S5_DUR,
  S6_START,
  S6_DUR,
  S7_START,
  S7_DUR,
} from "./tokens";

const S1_START = 0;

export const TovVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.brand[900] }}>
      {/* S1 — Hook: Data Shock */}
      <Sequence from={S1_START} durationInFrames={S1_DUR}>
        <Scene1Hook durationInFrames={S1_DUR} />
      </Sequence>

      {/* Transition: S1→S2 */}
      <Sequence from={S2_START - 4} durationInFrames={12}>
        <GradientSweep delay={0} color={colors.brand[700]} angle={90} />
      </Sequence>

      {/* S2 — Problem: Cost Structure */}
      <Sequence from={S2_START} durationInFrames={S2_DUR}>
        <Scene2Reality durationInFrames={S2_DUR} />
      </Sequence>

      {/* Transition: S2→S3 */}
      <Sequence from={S3_START - 4} durationInFrames={12}>
        <GradientSweep delay={0} color={colors.accentDark} angle={135} />
      </Sequence>

      {/* S3 — Solution: Brand Reveal */}
      <Sequence from={S3_START} durationInFrames={S3_DUR}>
        <Scene3Solution durationInFrames={S3_DUR} />
      </Sequence>

      {/* Transition: S3→S4 */}
      <Sequence from={S4_START - 4} durationInFrames={12}>
        <GradientSweep delay={0} color={colors.brand[800]} angle={-45} />
      </Sequence>

      {/* S4 — Proof: Checklist */}
      <Sequence from={S4_START} durationInFrames={S4_DUR}>
        <Scene4Proof durationInFrames={S4_DUR} />
      </Sequence>

      {/* Transition: S4→S5 */}
      <Sequence from={S5_START - 4} durationInFrames={12}>
        <GradientSweep delay={0} color={colors.accent} angle={0} />
      </Sequence>

      {/* S5 — Results: Chart + Stats */}
      <Sequence from={S5_START} durationInFrames={S5_DUR}>
        <Scene5Results durationInFrames={S5_DUR} />
      </Sequence>

      {/* Transition: S5→S6 */}
      <Sequence from={S6_START - 4} durationInFrames={12}>
        <GradientSweep delay={0} color={colors.accentDark} angle={135} />
      </Sequence>

      {/* S6 — CTA */}
      <Sequence from={S6_START} durationInFrames={S6_DUR}>
        <Scene6CTA durationInFrames={S6_DUR} />
      </Sequence>

      {/* S7 — Ending */}
      <Sequence from={S7_START} durationInFrames={S7_DUR}>
        <Scene7Ending durationInFrames={S7_DUR} />
      </Sequence>
    </AbsoluteFill>
  );
};
