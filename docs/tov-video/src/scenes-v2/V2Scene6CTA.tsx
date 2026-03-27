import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { colors, TYPO, FONT } from "../tokens";
import { BounceIn, GlowPulse, TextSplit, SafeZone } from "../primitives";

interface Props {
  durationInFrames: number;
}

export const V2Scene6CTA: React.FC<Props> = ({ durationInFrames }) => {
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
      <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.7)" }} />

      <SafeZone format="reels" justify="center" gap={40}>
        <TextSplit
          text="투명한 원가 확실한 결과"
          delay={8}
          stagger={3}
          mode="word"
          slideY={15}
          accentWords={["투명한", "확실한"]}
          accentColor={colors.accent}
          style={{
            fontSize: TYPO.cta,
            fontWeight: 400,
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.75)",
            fontFamily: FONT.main,
            justifyContent: "center",
          }}
        />

        <BounceIn delay={25}>
          <div
            style={{
              fontSize: TYPO.hero,
              fontWeight: 800,
              color: colors.white,
              textAlign: "center",
              fontFamily: FONT.main,
            }}
          >
            무료 견적 받기
          </div>
        </BounceIn>

        <BounceIn delay={45}>
          <GlowPulse
            startFrame={60}
            color="rgba(100, 154, 70, 0.5)"
            intensity={35}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: `linear-gradient(135deg, ${colors.accentDark}, ${colors.accent})`,
              color: colors.white,
              fontSize: TYPO.cta,
              fontWeight: 700,
              padding: "40px 96px",
              borderRadius: 60,
              marginTop: 16,
              fontFamily: FONT.main,
              boxShadow: "0 8px 32px rgba(125,184,94,0.3)",
            }}
          >
            상담 신청하기
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
