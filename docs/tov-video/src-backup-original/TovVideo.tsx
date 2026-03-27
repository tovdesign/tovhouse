import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene2Reality } from "./scenes/Scene2Reality";
import { Scene3Solution } from "./scenes/Scene3Solution";
import { Scene4Proof } from "./scenes/Scene4Proof";
import { Scene5Results } from "./scenes/Scene5Results";
import { Scene6CTA } from "./scenes/Scene6CTA";
import { Scene7Ending } from "./scenes/Scene7Ending";

// 30fps 기준 프레임 계산
const FPS = 30;
const S1_START = 0;
const S1_DUR = 4 * FPS; // 120 frames (0~4초)
const S2_START = S1_DUR;
const S2_DUR = 4 * FPS; // 120 frames (4~8초)
const S3_START = S2_START + S2_DUR;
const S3_DUR = 5 * FPS; // 150 frames (8~13초)
const S4_START = S3_START + S3_DUR;
const S4_DUR = 5 * FPS; // 150 frames (13~18초)
const S5_START = S4_START + S4_DUR;
const S5_DUR = 5 * FPS; // 150 frames (18~23초)
const S6_START = S5_START + S5_DUR;
const S6_DUR = 4 * FPS; // 120 frames (23~27초)
const S7_START = S6_START + S6_DUR;
const S7_DUR = 5 * FPS; // 150 frames (27~32초)

export const TovVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a1a" }}>
      {/* 배경음악 */}
      <Audio
        src={staticFile("bgm.mp3")}
        volume={(f) => {
          const totalFrames = 960;
          const fadeStart = totalFrames - 30;
          if (f >= fadeStart) {
            return 0.3 * (1 - (f - fadeStart) / 30);
          }
          return 0.3;
        }}
      />

      {/* S1 Whoosh - 씬 시작 전환 */}
      <Sequence from={S1_START + 3} durationInFrames={20}>
        <Audio src={staticFile("sfx-whoosh.mp3")} volume={1.0} />
      </Sequence>

      {/* S2 타이핑 SFX - 타이핑 시작 시점 */}
      <Sequence from={S2_START + 10} durationInFrames={90}>
        <Audio src={staticFile("sfx-typing.mp3")} volume={0.5} />
      </Sequence>

      {/* S3 Whoosh - 로고 등장 */}
      <Sequence from={S3_START + 3} durationInFrames={20}>
        <Audio src={staticFile("sfx-whoosh.mp3")} volume={0.9} />
      </Sequence>

      {/* S4 Pop - 카드 1 등장 */}
      <Sequence from={S4_START + 30} durationInFrames={10}>
        <Audio src={staticFile("sfx-pop.mp3")} volume={1.0} />
      </Sequence>
      {/* S4 Pop - 카드 2 등장 (0.7초 후) */}
      <Sequence from={S4_START + 51} durationInFrames={10}>
        <Audio src={staticFile("sfx-pop.mp3")} volume={0.9} />
      </Sequence>
      {/* S4 Pop - 카드 3 등장 (1.4초 후) */}
      <Sequence from={S4_START + 72} durationInFrames={10}>
        <Audio src={staticFile("sfx-pop.mp3")} volume={0.85} />
      </Sequence>

      {/* S5 Whoosh - 상하 분할 등장 */}
      <Sequence from={S5_START + 3} durationInFrames={20}>
        <Audio src={staticFile("sfx-whoosh.mp3")} volume={0.9} />
      </Sequence>

      {/* S6 Pop - CTA 버튼 바운스 */}
      <Sequence from={S6_START + 45} durationInFrames={10}>
        <Audio src={staticFile("sfx-pop.mp3")} volume={1.0} />
      </Sequence>

      {/* 씬 시퀀스 */}
      <Sequence from={S1_START} durationInFrames={S1_DUR}>
        <Scene1Hook />
      </Sequence>

      <Sequence from={S2_START} durationInFrames={S2_DUR}>
        <Scene2Reality />
      </Sequence>

      <Sequence from={S3_START} durationInFrames={S3_DUR}>
        <Scene3Solution />
      </Sequence>

      <Sequence from={S4_START} durationInFrames={S4_DUR}>
        <Scene4Proof />
      </Sequence>

      <Sequence from={S5_START} durationInFrames={S5_DUR}>
        <Scene5Results />
      </Sequence>

      <Sequence from={S6_START} durationInFrames={S6_DUR}>
        <Scene6CTA />
      </Sequence>

      <Sequence from={S7_START} durationInFrames={S7_DUR}>
        <Scene7Ending />
      </Sequence>
    </AbsoluteFill>
  );
};
