import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface GlowPulseProps {
  children: React.ReactNode;
  startFrame?: number;
  color?: string;
  intensity?: number;
  period?: number; // frames per cycle
  style?: React.CSSProperties;
}

export const GlowPulse: React.FC<GlowPulseProps> = ({
  children,
  startFrame = 0,
  color = "rgba(125, 184, 94, 0.6)",
  intensity = 30,
  period = 30,
  style,
}) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  const cycleFrame = f % period;

  const glowSize = interpolate(
    cycleFrame,
    [0, period / 2, period],
    [intensity * 0.4, intensity, intensity * 0.4],
  );

  const scale = interpolate(
    cycleFrame,
    [0, period / 2, period],
    [1.0, 1.04, 1.0],
  );

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        boxShadow: `0 0 ${glowSize}px ${glowSize * 0.4}px ${color}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
