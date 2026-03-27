import React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";

interface TypeWriterProps {
  text: string;
  startFrame?: number;
  speed?: number; // frames per character
  cursorColor?: string;
  style?: React.CSSProperties;
}

export const TypeWriter: React.FC<TypeWriterProps> = ({
  text,
  startFrame = 0,
  speed = 2,
  cursorColor = "#7db85e",
  style,
}) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  const totalFrames = text.length * speed;

  const charCount = interpolate(f, [0, totalFrames], [0, text.length], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.linear,
  });

  const showCursor = Math.floor(charCount) < text.length;
  const blink = frame % 10 < 5;

  return (
    <span style={style}>
      {text.slice(0, Math.floor(charCount))}
      {showCursor && (
        <span style={{ opacity: blink ? 1 : 0, color: cursorColor }}>|</span>
      )}
    </span>
  );
};
