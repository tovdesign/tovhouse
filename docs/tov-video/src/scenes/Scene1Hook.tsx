import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  OffthreadVideo,
  staticFile,
} from "remotion";
import { colors, TYPO, FONT } from "../tokens";
import { FadeIn, SafeZone } from "../primitives";

interface Scene1HookProps {
  durationInFrames: number;
}

export const Scene1Hook: React.FC<Scene1HookProps> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {/* Background video */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <OffthreadVideo
          src={staticFile("img/v2/bg-video-1.mp4")}
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
        <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.75)" }} />
      </AbsoluteFill>

      <SafeZone format="reels" justify="center" gap={36}>
        {/* Main headline */}
        <FadeIn delay={5} slideY={30}>
          <div
            style={{
              textAlign: "center",
              lineHeight: 1.4,
              fontFamily: FONT.main,
            }}
          >
            <div
              style={{
                fontSize: TYPO.cta,
                fontWeight: 500,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              견적서 속 숨겨진
            </div>
            <div
              style={{
                fontSize: TYPO.stat,
                fontWeight: 900,
                color: colors.danger,
                lineHeight: 1.1,
                marginTop: 8,
              }}
            >
              마진
            </div>
            <div
              style={{
                fontSize: TYPO.cta,
                fontWeight: 600,
                color: colors.white,
                marginTop: 12,
              }}
            >
              알고 계신가요?
            </div>
          </div>
        </FadeIn>

        {/* Source citation — bigger, pushed down */}
        <FadeIn delay={55} slideY={15}>
          <div
            style={{
              fontSize: 34,
              fontWeight: 400,
              color: colors.brand[500],
              fontFamily: FONT.main,
              textAlign: "center",
              lineHeight: 1.6,
              marginTop: 40,
            }}
          >
            *NAHB 리모델링 마진 조사 (2024)
            <br />
            국내 업체 공개 마진율 15~24% 기준
          </div>
        </FadeIn>
      </SafeZone>
    </AbsoluteFill>
  );
};
