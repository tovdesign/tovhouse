import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  OffthreadVideo,
  staticFile,
} from "remotion";
import { colors, TYPO, FONT } from "../tokens";
import { TypeWriter, FadeIn, SafeZone } from "../primitives";

interface Props {
  durationInFrames: number;
}

export const V3Scene2Problem: React.FC<Props> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <OffthreadVideo
          src={staticFile("img/v2/bg-video-2.mp4")}
          volume={0}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            minWidth: 1200,
            minHeight: 2100,
            width: "auto",
            height: "auto",
          }}
        />
        <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.82)" }} />
      </AbsoluteFill>

      <SafeZone format="reels" justify="center" gap={52}>
        <FadeIn delay={5} slideY={30}>
          <div
            style={{
              fontSize: TYPO.title,
              fontWeight: 800,
              color: colors.white,
              fontFamily: FONT.main,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            이런 경험 있으신가요?
          </div>
        </FadeIn>

        {/* TypeWriter — ★ NEW PRIMITIVE (2 lines to avoid orphan text) */}
        <div style={{ textAlign: "center" }}>
          <div>
            <TypeWriter
              text="견적서를 받았는데"
              startFrame={25}
              speed={2}
              cursorColor={colors.accent}
              style={{
                fontSize: TYPO.cta,
                fontWeight: 500,
                color: "rgba(255,255,255,0.85)",
                fontFamily: FONT.main,
              }}
            />
          </div>
          <div>
            <TypeWriter
              text="뭐가 뭔지 모르겠고..."
              startFrame={42}
              speed={2}
              cursorColor={colors.accent}
              style={{
                fontSize: TYPO.cta,
                fontWeight: 500,
                color: "rgba(255,255,255,0.85)",
                fontFamily: FONT.main,
              }}
            />
          </div>
        </div>

        <TypeWriter
          text="어디에 얼마가 쓰이는지 알 수가 없다"
          startFrame={65}
          speed={2}
          cursorColor={colors.danger}
          style={{
            fontSize: TYPO.cta,
            fontWeight: 600,
            color: colors.danger,
            fontFamily: FONT.main,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        />
      </SafeZone>
    </AbsoluteFill>
  );
};
