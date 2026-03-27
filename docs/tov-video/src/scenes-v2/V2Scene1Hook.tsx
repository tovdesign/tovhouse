import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  OffthreadVideo,
  staticFile,
} from "remotion";
import { colors, TYPO, FONT } from "../tokens";
import { FadeIn, SafeZone, CountUp } from "../primitives";

interface Props {
  durationInFrames: number;
}

export const V2Scene1Hook: React.FC<Props> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  const gradAngle = interpolate(frame, [0, durationInFrames], [160, 170], {
    extrapolateRight: "clamp",
  });

  const bgScale = interpolate(frame, [0, durationInFrames], [1.05, 1.15], {
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
            transform: `translate(-50%, -50%) scale(${bgScale})`,
            minWidth: 1200,
            minHeight: 2100,
            width: "auto",
            height: "auto",
          }}
        />
        <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.75)" }} />
      </AbsoluteFill>

      <SafeZone format="reels" justify="center" gap={48}>
        {/* Stat badge */}
        <FadeIn delay={5} slideY={0}>
          <div
            style={{
              textAlign: "center",
              background: "rgba(255,255,255,0.06)",
              borderRadius: 24,
              padding: "32px 56px",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                fontSize: 140,
                fontWeight: 900,
                color: colors.accent,
                fontFamily: FONT.mono,
                letterSpacing: -4,
                lineHeight: 1,
              }}
            >
              <CountUp from={0} to={847} delay={8} duration={30} suffix="+" />
            </div>
            <FadeIn delay={20} slideY={12}>
              <div
                style={{
                  fontSize: TYPO.body,
                  fontWeight: 400,
                  color: colors.brand[400],
                  fontFamily: FONT.main,
                  marginTop: 12,
                }}
              >
                시공 완료 프로젝트
              </div>
            </FadeIn>
          </div>
        </FadeIn>

        {/* Main headline — two lines */}
        <FadeIn delay={35} slideY={30}>
          <div
            style={{
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            <div
              style={{
                fontSize: TYPO.title,
                fontWeight: 800,
                color: colors.white,
                fontFamily: FONT.main,
              }}
            >
              같은 돈, <span style={{ color: colors.accent }}>다른 결과</span>
            </div>
            <div
              style={{
                fontSize: TYPO.cta,
                fontWeight: 500,
                color: "rgba(255,255,255,0.7)",
                fontFamily: FONT.main,
                marginTop: 12,
              }}
            >
              어디서 차이가 날까?
            </div>
          </div>
        </FadeIn>

        {/* Sub — bigger */}
        <FadeIn delay={60} slideY={15}>
          <div
            style={{
              fontSize: TYPO.subtitle,
              fontWeight: 600,
              color: colors.brand[400],
              fontFamily: FONT.main,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            토브디자인 시공 결과 비교
          </div>
        </FadeIn>
      </SafeZone>
    </AbsoluteFill>
  );
};
