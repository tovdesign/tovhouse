import { AbsoluteFill, Sequence } from "remotion";
import { SceneWipe } from "./primitives";
import { V3Scene1Hook } from "./scenes-v3/V3Scene1Hook";
import { V3Scene2Problem } from "./scenes-v3/V3Scene2Problem";
import { V3Scene3Process } from "./scenes-v3/V3Scene3Process";
import { V3Scene4Results } from "./scenes-v3/V3Scene4Results";
import { V3Scene5CTA } from "./scenes-v3/V3Scene5CTA";
import { V3Scene6Ending } from "./scenes-v3/V3Scene6Ending";
import {
  colors,
  V3_S1_DUR,
  V3_S2_START,
  V3_S2_DUR,
  V3_S3_START,
  V3_S3_DUR,
  V3_S4_START,
  V3_S4_DUR,
  V3_S5_START,
  V3_S5_DUR,
  V3_S6_START,
  V3_S6_DUR,
} from "./tokens-v3";

export const TovProcess: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.brand[900] }}>
      {/* S1 — Hook: SlideIn */}
      <Sequence from={0} durationInFrames={V3_S1_DUR}>
        <V3Scene1Hook durationInFrames={V3_S1_DUR} />
      </Sequence>

      {/* SceneWipe transition — ★ NEW PRIMITIVE */}
      <Sequence from={V3_S2_START - 5} durationInFrames={15}>
        <SceneWipe delay={0} direction="left" color={colors.accentDark}>
          <div />
        </SceneWipe>
      </Sequence>

      {/* S2 — Problem: TypeWriter */}
      <Sequence from={V3_S2_START} durationInFrames={V3_S2_DUR}>
        <V3Scene2Problem durationInFrames={V3_S2_DUR} />
      </Sequence>

      {/* SceneWipe transition */}
      <Sequence from={V3_S3_START - 5} durationInFrames={15}>
        <SceneWipe delay={0} direction="right" color={colors.accent}>
          <div />
        </SceneWipe>
      </Sequence>

      {/* S3 — Process: ChecklistItem + ProgressBar */}
      <Sequence from={V3_S3_START} durationInFrames={V3_S3_DUR}>
        <V3Scene3Process durationInFrames={V3_S3_DUR} />
      </Sequence>

      {/* SceneWipe transition */}
      <Sequence from={V3_S4_START - 5} durationInFrames={15}>
        <SceneWipe delay={0} direction="left" color={colors.brand[700]}>
          <div />
        </SceneWipe>
      </Sequence>

      {/* S4 — Results: BarChart */}
      <Sequence from={V3_S4_START} durationInFrames={V3_S4_DUR}>
        <V3Scene4Results durationInFrames={V3_S4_DUR} />
      </Sequence>

      {/* SceneWipe transition */}
      <Sequence from={V3_S5_START - 5} durationInFrames={15}>
        <SceneWipe delay={0} direction="right" color={colors.accentDark}>
          <div />
        </SceneWipe>
      </Sequence>

      {/* S5 — CTA */}
      <Sequence from={V3_S5_START} durationInFrames={V3_S5_DUR}>
        <V3Scene5CTA durationInFrames={V3_S5_DUR} />
      </Sequence>

      {/* S6 — Ending */}
      <Sequence from={V3_S6_START} durationInFrames={V3_S6_DUR}>
        <V3Scene6Ending durationInFrames={V3_S6_DUR} />
      </Sequence>
    </AbsoluteFill>
  );
};
