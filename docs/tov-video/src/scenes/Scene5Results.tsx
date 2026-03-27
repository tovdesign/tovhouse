import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, TYPO, FONT, SPRING } from "../tokens";
import { FadeIn, BounceIn, CountUp, BarChart, SafeZone } from "../primitives";

interface Scene5ResultsProps {
  durationInFrames: number;
}

const CHART_DATA = [
  { label: "일반\n업체", value: 5000, color: colors.brand[500] },
  { label: "토브\n디자인", value: 3000, color: colors.accent },
];

export const Scene5Results: React.FC<Scene5ResultsProps> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Background images — split reveal
  const topProgress = spring({
    frame: frame - 3,
    fps,
    config: SPRING.snappy,
  });
  const topY = interpolate(topProgress, [0, 1], [-960, 0]);

  const bottomProgress = spring({
    frame: frame - 10,
    fps,
    config: SPRING.snappy,
  });
  const bottomY = interpolate(bottomProgress, [0, 1], [960, 0]);

  // Parallax
  const kitchenScale = interpolate(frame, [0, 150], [1.05, 1.18], {
    extrapolateRight: "clamp",
  });
  const bathScale = interpolate(frame, [0, 150], [1.12, 1.05], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {/* Top — Kitchen */}
      <AbsoluteFill
        style={{
          height: "45%",
          overflow: "hidden",
          transform: `translateY(${topY}px)`,
        }}
      >
        <AbsoluteFill style={{ transform: `scale(${kitchenScale})` }}>
          <Img
            src={staticFile("img/s5-kitchen.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
        <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.35)" }} />
      </AbsoluteFill>

      {/* Bottom — Bathroom */}
      <AbsoluteFill
        style={{
          top: "45%",
          height: "55%",
          overflow: "hidden",
          transform: `translateY(${bottomY}px)`,
        }}
      >
        <AbsoluteFill style={{ transform: `scale(${bathScale})` }}>
          <Img
            src={staticFile("img/s5-bathroom.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
        <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.55)" }} />

        {/* Data overlay on bottom half */}
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
            padding: "40px 60px",
          }}
        >
          {/* Bar chart comparison */}
          <FadeIn delay={30} slideY={30}>
            <BarChart
              data={CHART_DATA}
              delay={35}
              stagger={8}
              maxHeight={240}
              barWidth={140}
              gap={80}
              labelStyle={{
                fontSize: TYPO.caption,
                fontFamily: FONT.main,
              }}
            />
          </FadeIn>

          {/* Saving highlight */}
          <BounceIn delay={60}>
            <div
              style={{
                textAlign: "center",
                background: "rgba(0,0,0,0.5)",
                borderRadius: 20,
                padding: "24px 48px",
                border: `2px solid ${colors.accent}`,
              }}
            >
              <div
                style={{
                  fontSize: TYPO.subtitle,
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.7)",
                  fontFamily: FONT.main,
                }}
              >
                최대
              </div>
              <div
                style={{
                  fontSize: TYPO.title,
                  fontWeight: 900,
                  color: colors.accent,
                  fontFamily: FONT.mono,
                }}
              >
                <CountUp from={0} to={2000} delay={65} suffix="만원" />
              </div>
              <div
                style={{
                  fontSize: TYPO.body,
                  fontWeight: 600,
                  color: colors.white,
                  fontFamily: FONT.main,
                }}
              >
                절감 효과
              </div>
            </div>
          </BounceIn>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* Divider */}
      <div
        style={{
          position: "absolute",
          top: "45%",
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${colors.accent}80, transparent)`,
          transform: "translateY(-50%)",
          zIndex: 5,
        }}
      />
    </AbsoluteFill>
  );
};
