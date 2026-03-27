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

interface Props {
  durationInFrames: number;
}

export const V3Scene6Ending: React.FC<Props> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  const bgOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
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
            src={staticFile("logo.png")}
            style={{
              width: 420,
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
            원가 기반 인테리어
          </div>
        </FadeIn>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
