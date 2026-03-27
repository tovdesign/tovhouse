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

interface Scene2RealityProps {
  durationInFrames: number;
}

export const Scene2Reality: React.FC<Scene2RealityProps> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {/* Background video */}
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
        <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.8)" }} />
      </AbsoluteFill>

      <SafeZone format="reels" justify="center" gap={36}>
        <FadeIn delay={8} slideY={30}>
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
                color: "rgba(255,255,255,0.7)",
              }}
            >
              대부분의 업체는
            </div>
            <div
              style={{
                fontSize: TYPO.stat,
                fontWeight: 900,
                color: colors.danger,
                lineHeight: 1.1,
                marginTop: 12,
              }}
            >
              원가
            </div>
            <div
              style={{
                fontSize: TYPO.cta,
                fontWeight: 500,
                color: "rgba(255,255,255,0.7)",
                marginTop: 4,
              }}
            >
              를
            </div>
            <div
              style={{
                fontSize: TYPO.title,
                fontWeight: 800,
                color: colors.white,
                marginTop: 16,
              }}
            >
              공개하지 않습니다
            </div>
          </div>
        </FadeIn>
      </SafeZone>
    </AbsoluteFill>
  );
};
