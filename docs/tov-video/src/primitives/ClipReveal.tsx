import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { SPRING } from "../tokens";

type RevealDirection = "left" | "right" | "top" | "bottom";

interface ClipRevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: RevealDirection;
  style?: React.CSSProperties;
}

const getClipPath = (direction: RevealDirection, progress: number) => {
  switch (direction) {
    case "left":
      return `inset(0 ${interpolate(progress, [0, 1], [100, 0])}% 0 0)`;
    case "right":
      return `inset(0 0 0 ${interpolate(progress, [0, 1], [100, 0])}%)`;
    case "top":
      return `inset(0 0 ${interpolate(progress, [0, 1], [100, 0])}% 0)`;
    case "bottom":
      return `inset(${interpolate(progress, [0, 1], [100, 0])}% 0 0 0)`;
  }
};

export const ClipReveal: React.FC<ClipRevealProps> = ({
  children,
  delay = 0,
  direction = "left",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: SPRING.snappy,
  });

  return (
    <div
      style={{
        clipPath: getClipPath(direction, progress),
        ...style,
      }}
    >
      {children}
    </div>
  );
};
