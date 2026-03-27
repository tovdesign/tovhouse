import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface GradientSweepProps {
  delay?: number;
  color?: string;
  angle?: number;
  bandWidth?: number;
}

/**
 * Diagonal gradient blade that sweeps across the frame.
 * Use as a scene transition overlay — renders a colored
 * band that enters and exits the frame.
 */
export const GradientSweep: React.FC<GradientSweepProps> = ({
  delay = 0,
  color = "#649a46",
  angle = 135,
  bandWidth = 5,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 180 },
  });

  const sweepPos = interpolate(progress, [0, 1], [-100, 200]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(${angle}deg,
          transparent ${sweepPos - 30}%,
          ${color} ${sweepPos}%,
          ${color} ${sweepPos + bandWidth}%,
          transparent ${sweepPos + 35}%)`,
        zIndex: 20,
        pointerEvents: "none",
      }}
    />
  );
};
