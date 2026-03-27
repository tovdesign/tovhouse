import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  OffthreadVideo,
  staticFile,
} from "remotion";
import { colors, TYPO, FONT } from "../tokens";
import { SlideIn, FadeIn, SafeZone } from "../primitives";

interface Props {
  durationInFrames: number;
}

export const V3Scene1Hook: React.FC<Props> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
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
        <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.7)" }} />
      </AbsoluteFill>

      <SafeZone format="reels" justify="center" gap={40}>
        {/* Left slide title */}
        <SlideIn delay={5} direction="left" distance={80}>
          <div
            style={{
              fontSize: TYPO.hero,
              fontWeight: 900,
              color: colors.white,
              fontFamily: FONT.main,
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            시공 과정
          </div>
        </SlideIn>

        {/* Right slide subtitle */}
        <SlideIn delay={18} direction="right" distance={80}>
          <div
            style={{
              fontSize: TYPO.title,
              fontWeight: 600,
              color: colors.accent,
              fontFamily: FONT.main,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            A to Z 공개
          </div>
        </SlideIn>

        <FadeIn delay={35} slideY={20}>
          <div
            style={{
              fontSize: TYPO.subtitle,
              fontWeight: 400,
              color: "rgba(255,255,255,0.6)",
              fontFamily: FONT.main,
              textAlign: "center",
            }}
          >
            토브하우스는 모든 과정을 투명하게
          </div>
        </FadeIn>
      </SafeZone>
    </AbsoluteFill>
  );
};
