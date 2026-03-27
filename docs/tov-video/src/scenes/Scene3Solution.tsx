import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  OffthreadVideo,
} from "remotion";
import { colors, TYPO, FONT } from "../tokens";
import { FadeIn, ScaleIn, PopBadge, SafeZone } from "../primitives";

interface Scene3SolutionProps {
  durationInFrames: number;
}

const KEYWORDS = ["시공자재", "인건비", "집행내역"];

export const Scene3Solution: React.FC<Scene3SolutionProps> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {/* Background video */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <OffthreadVideo
          src={staticFile("img/v2/bg-video-3.mp4")}
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
        <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.72)" }} />
      </AbsoluteFill>

      <SafeZone format="reels" justify="center" gap={44}>
        {/* Logo */}
        <ScaleIn delay={5} fromScale={0.3}>
          <Img
            src={staticFile("logo.png")}
            style={{ width: 280, filter: "brightness(10)" }}
          />
        </ScaleIn>

        {/* Keywords — bounce in one by one */}
        <div
          style={{
            display: "flex",
            gap: 24,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {KEYWORDS.map((word, i) => (
            <PopBadge key={i} delay={20 + i * 15}>
              <div
                style={{
                  fontSize: TYPO.cta,
                  fontWeight: 700,
                  color: colors.white,
                  fontFamily: FONT.main,
                  padding: "16px 36px",
                  borderRadius: 20,
                  background: "rgba(255,255,255,0.1)",
                  border: `2px solid ${colors.accent}`,
                }}
              >
                {word}
              </div>
            </PopBadge>
          ))}
        </div>

        {/* Main message */}
        <FadeIn delay={65} slideY={30}>
          <div
            style={{
              textAlign: "center",
              fontFamily: FONT.main,
            }}
          >
            <div
              style={{
                fontSize: TYPO.hero,
                fontWeight: 900,
                color: colors.accent,
                lineHeight: 1.2,
              }}
            >
              전부 공개합니다!
            </div>
          </div>
        </FadeIn>
      </SafeZone>
    </AbsoluteFill>
  );
};
