import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { colors, TYPO, FONT } from "../tokens";
import { FadeIn, BarChart, CountUp, BounceIn, SafeZone } from "../primitives";

interface Props {
  durationInFrames: number;
}

const CHART_DATA = [
  { label: "일반\n업체", value: 5200, color: colors.brand[500] },
  { label: "토브\n하우스", value: 3200, color: colors.accent },
];

export const V3Scene4Results: React.FC<Props> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  const bgScale = interpolate(frame, [0, durationInFrames], [1.0, 1.1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      <AbsoluteFill style={{ transform: `scale(${bgScale})` }}>
        <Img
          src={staticFile("img/s5-kitchen.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.72)" }} />

      <SafeZone format="reels" justify="center" gap={48}>
        <FadeIn delay={5} slideY={30}>
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
            비용 비교
          </div>
        </FadeIn>

        {/* BarChart — ★ NEW PRIMITIVE */}
        <FadeIn delay={15} slideY={0}>
          <BarChart
            data={CHART_DATA}
            delay={20}
            stagger={10}
            maxHeight={320}
            barWidth={180}
            gap={120}
            labelStyle={{
              fontSize: TYPO.caption,
              fontFamily: FONT.main,
            }}
          />
        </FadeIn>

        <BounceIn delay={55}>
          <div
            style={{
              textAlign: "center",
              background: "rgba(0,0,0,0.5)",
              borderRadius: 24,
              padding: "28px 56px",
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
              평균
            </div>
            <div
              style={{
                fontSize: TYPO.hero,
                fontWeight: 900,
                color: colors.accent,
                fontFamily: FONT.mono,
              }}
            >
              <CountUp from={0} to={2000} delay={60} suffix="만원" />
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
      </SafeZone>
    </AbsoluteFill>
  );
};
