import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { SPRING } from "../tokens";

interface UnderlineProps {
  children: React.ReactNode;
  delay?: number;
  color?: string;
  thickness?: number;
  style?: React.CSSProperties;
}

export const Underline: React.FC<UnderlineProps> = ({
  children,
  delay = 0,
  color = "#649a46",
  thickness = 8,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: SPRING.snappy,
  });

  const width = interpolate(progress, [0, 1], [0, 100]);

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        ...style,
      }}
    >
      {children}
      <span
        style={{
          position: "absolute",
          bottom: -2,
          left: 0,
          width: `${width}%`,
          height: thickness,
          backgroundColor: color,
          borderRadius: thickness / 2,
          opacity: 0.7,
        }}
      />
    </span>
  );
};
