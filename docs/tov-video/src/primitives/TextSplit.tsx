import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { SPRING } from "../tokens";

type SplitMode = "word" | "character";

interface TextSplitProps {
  text: string;
  delay?: number;
  stagger?: number; // frames between each unit
  mode?: SplitMode;
  slideY?: number;
  style?: React.CSSProperties;
  accentWords?: string[]; // words to highlight
  accentColor?: string;
}

export const TextSplit: React.FC<TextSplitProps> = ({
  text,
  delay = 0,
  stagger = 4,
  mode = "word",
  slideY = 25,
  style,
  accentWords = [],
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const units = mode === "word" ? text.split(" ") : text.split("");

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: mode === "word" ? "0.3em" : 0,
        ...style,
      }}
    >
      {units.map((unit, i) => {
        const unitDelay = delay + i * stagger;
        const progress = spring({
          frame: frame - unitDelay,
          fps,
          config: SPRING.gentle,
        });

        const isAccent = accentWords.includes(unit);

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: interpolate(progress, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(progress, [0, 1], [slideY, 0])}px)`,
              color: isAccent && accentColor ? accentColor : undefined,
              fontWeight: isAccent ? 800 : undefined,
            }}
          >
            {unit}
          </span>
        );
      })}
    </div>
  );
};
