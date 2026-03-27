import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { colors, TYPO, FONT } from "../tokens";
import {
  FadeIn,
  BounceIn,
  GlowPulse,
  TextSplit,
  SafeZone,
} from "../primitives";

interface Scene6CTAProps {
  durationInFrames: number;
}

export const Scene6CTA: React.FC<Scene6CTAProps> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const bgScale = interpolate(frame, [0, durationInFrames], [1.0, 1.06], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      <AbsoluteFill style={{ transform: `scale(${bgScale})` }}>
        <Img
          src={staticFile("img/s6-cta.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.65)" }} />

      <SafeZone format="reels" justify="center" gap={40}>
        {/* Lead — word by word */}
        <TextSplit
          text="견적 비교 더 이상 어렵지 않습니다"
          delay={8}
          stagger={3}
          mode="word"
          slideY={15}
          style={{
            fontSize: TYPO.cta,
            fontWeight: 400,
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.75)",
            fontFamily: FONT.main,
            justifyContent: "center",
          }}
        />

        {/* Main CTA text */}
        <BounceIn delay={30}>
          <div
            style={{
              fontSize: TYPO.hero,
              fontWeight: 800,
              color: colors.white,
              textAlign: "center",
              fontFamily: FONT.main,
            }}
          >
            무료 견적 상담
          </div>
        </BounceIn>

        {/* CTA button */}
        <BounceIn delay={50}>
          <GlowPulse
            startFrame={70}
            color="rgba(100, 154, 70, 0.5)"
            intensity={35}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: colors.accentDark,
              color: colors.white,
              fontSize: TYPO.cta,
              fontWeight: 700,
              padding: "40px 96px",
              borderRadius: 60,
              marginTop: 16,
              fontFamily: FONT.main,
            }}
          >
            지금 상담받기
            <svg
              viewBox="0 0 24 24"
              width="42"
              height="42"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </GlowPulse>
        </BounceIn>
      </SafeZone>
    </AbsoluteFill>
  );
};
