import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  OffthreadVideo,
  staticFile,
} from "remotion";
import { colors, TYPO, FONT } from "../tokens";
import { FadeIn, ClipReveal, ChecklistItem, SafeZone } from "../primitives";

interface Scene4ProofProps {
  durationInFrames: number;
}

const CHECKLIST = [
  "영수증 · 입금증 항목별 증빙",
  "양도소득세 필요경비 증빙",
  "시공자재 고객이 직접 선택",
];

export const Scene4Proof: React.FC<Scene4ProofProps> = ({
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
          src={staticFile("img/v2/bg-video-4.mp4")}
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

      <SafeZone format="reels" justify="center" gap={56}>
        {/* Section label — 30%+ bigger */}
        <ClipReveal delay={5} direction="left">
          <div
            style={{
              fontSize: 42,
              fontWeight: 600,
              color: colors.accent,
              fontFamily: FONT.mono,
              letterSpacing: 5,
              textTransform: "uppercase" as const,
            }}
          >
            TRANSPARENCY
          </div>
        </ClipReveal>

        {/* Title — 30%+ bigger */}
        <FadeIn delay={10} slideY={30}>
          <div
            style={{
              fontSize: TYPO.hero,
              fontWeight: 800,
              color: colors.white,
              fontFamily: FONT.main,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            <span style={{ color: colors.accent }}>시공북</span> 제공
          </div>
        </FadeIn>

        <FadeIn delay={18} slideY={20}>
          <div
            style={{
              fontSize: TYPO.subtitle,
              fontWeight: 400,
              color: "rgba(255,255,255,0.5)",
              fontFamily: FONT.main,
              textAlign: "center",
            }}
          >
            모든 내역을 투명하게 증빙합니다
          </div>
        </FadeIn>

        {/* Divider — bigger */}
        <ClipReveal delay={25} direction="left">
          <div
            style={{
              width: 160,
              height: 4,
              background: colors.accent,
              borderRadius: 2,
            }}
          />
        </ClipReveal>

        {/* Checklist items — 30%+ bigger */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 48,
              alignItems: "flex-start",
            }}
          >
            {CHECKLIST.map((text, i) => (
              <ChecklistItem
                key={i}
                text={text}
                delay={35 + i * 22}
                checkColor={colors.accent}
                textStyle={{
                  fontSize: TYPO.subtitle,
                  fontFamily: FONT.main,
                }}
              />
            ))}
          </div>
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};
