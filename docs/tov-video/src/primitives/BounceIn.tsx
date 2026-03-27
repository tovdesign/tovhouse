import React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";

interface BounceInProps {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}

export const BounceIn: React.FC<BounceInProps> = ({
  children,
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);

  const scale = interpolate(f, [0, 8, 14, 18], [0, 1.12, 0.95, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });
  const opacity = interpolate(f, [0, 5], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <div style={{ opacity, transform: `scale(${scale})`, ...style }}>
      {children}
    </div>
  );
};
