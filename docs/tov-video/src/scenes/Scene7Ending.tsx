import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { colors, TYPO, FONT } from "../tokens";
import { ScaleIn, FadeIn } from "../primitives";

interface Scene7EndingProps {
  durationInFrames: number;
}

export const Scene7Ending: React.FC<Scene7EndingProps> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const bgOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    {
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
    },
  );

  return (
    <AbsoluteFill
      style={{ backgroundColor: colors.accentDark, opacity: bgOpacity }}
    >
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          opacity: fadeOut,
        }}
      >
        <ScaleIn delay={5} fromScale={0.3}>
          <Img
            src={staticFile("logo-tov-design.png")}
            style={{
              width: 500,
              objectFit: "contain",
              filter: "brightness(10)",
            }}
          />
        </ScaleIn>

        <FadeIn delay={20} slideY={15}>
          <div
            style={{
              fontSize: TYPO.subtitle,
              fontWeight: 600,
              color: colors.white,
              fontFamily: FONT.main,
              textAlign: "center",
            }}
          >
            시공원가 모두 공개
          </div>
        </FadeIn>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
