import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface PopBadgeProps {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}

export const PopBadge: React.FC<PopBadgeProps> = ({
  children,
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Low damping + high stiffness = elastic overshoot
  const popSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 6, stiffness: 150, mass: 0.6 },
  });

  const scale = interpolate(popSpring, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
  });
  const rotation = interpolate(popSpring, [0, 0.5, 1], [-12, 4, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <div
      style={{
        display: "inline-block",
        transform: `scale(${scale}) rotate(${rotation}deg)`,
        transformOrigin: "center center",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
