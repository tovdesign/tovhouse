import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  OffthreadVideo,
  staticFile,
} from "remotion";
import { colors, TYPO, FONT } from "../tokens";
import { FadeIn, ClipReveal, PieChart, SafeZone } from "../primitives";

interface Props {
  durationInFrames: number;
}

const PIE_DATA = [
  { label: "자재비", value: 40, color: colors.accent },
  { label: "인건비", value: 30, color: colors.accentLight },
  { label: "관리/경비", value: 10, color: colors.brand[400] },
  { label: "업체 마진", value: 20, color: colors.danger },
];

export const V2Scene2CostBreakdown: React.FC<Props> = ({
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

      <SafeZone format="reels" justify="center" gap={52}>
        {/* Section label */}
        <ClipReveal delay={5} direction="left">
          <div
            style={{
              fontSize: TYPO.caption,
              fontWeight: 600,
              color: colors.accent,
              fontFamily: FONT.mono,
              letterSpacing: 4,
              textTransform: "uppercase" as const,
            }}
          >
            COST BREAKDOWN
          </div>
        </ClipReveal>

        {/* Title */}
        <FadeIn delay={10} slideY={30}>
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
            당신의 견적서
          </div>
        </FadeIn>

        {/* PieChart — ★ NEW PRIMITIVE */}
        <FadeIn delay={18} slideY={0}>
          <PieChart
            data={PIE_DATA}
            delay={20}
            size={340}
            strokeWidth={56}
            showLabels={true}
            labelStyle={{
              fontSize: 34,
              fontWeight: 600,
              fontFamily: FONT.main,
            }}
          />
        </FadeIn>

        {/* Insight */}
        <FadeIn delay={75} slideY={20}>
          <div
            style={{
              fontSize: TYPO.subtitle,
              fontWeight: 500,
              color: "rgba(255,255,255,0.6)",
              fontFamily: FONT.main,
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            실제 인테리어{" "}
            <span style={{ color: colors.accent, fontWeight: 700 }}>원가</span>
            를<br />
            알고 계신가요?!
          </div>
        </FadeIn>
      </SafeZone>
    </AbsoluteFill>
  );
};
