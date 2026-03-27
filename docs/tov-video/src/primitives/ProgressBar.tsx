import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { SPRING } from "../tokens";

interface ProgressBarProps {
  progress: number; // 0-100
  delay?: number;
  height?: number;
  color?: string;
  bgColor?: string;
  label?: string;
  labelStyle?: React.CSSProperties;
  style?: React.CSSProperties;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  delay = 0,
  height = 24,
  color = "#649a46",
  bgColor = "rgba(255,255,255,0.1)",
  label,
  labelStyle,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const springProgress = spring({
    frame: frame - delay,
    fps,
    config: SPRING.gentle,
  });

  const width = interpolate(springProgress, [0, 1], [0, progress]);

  return (
    <div style={style}>
      {label && (
        <div
          style={{
            marginBottom: 8,
            opacity: interpolate(springProgress, [0, 0.3], [0, 1], {
              extrapolateRight: "clamp",
            }),
            ...labelStyle,
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          width: "100%",
          height,
          borderRadius: height / 2,
          backgroundColor: bgColor,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            borderRadius: height / 2,
            background: `linear-gradient(90deg, ${color}, ${color}dd)`,
          }}
        />
      </div>
    </div>
  );
};
