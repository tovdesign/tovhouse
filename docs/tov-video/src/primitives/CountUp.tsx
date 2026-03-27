import React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";

interface CountUpProps {
  from?: number;
  to: number;
  delay?: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  style?: React.CSSProperties;
}

export const CountUp: React.FC<CountUpProps> = ({
  from = 0,
  to,
  delay = 0,
  duration = 30,
  suffix = "",
  prefix = "",
  decimals = 0,
  style,
}) => {
  const frame = useCurrentFrame();

  // Use Easing.out(cubic) instead of spring — no overshoot, stops precisely
  const progress = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const value = interpolate(progress, [0, 1], [from, to]);
  const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value);

  return (
    <span style={style}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
};
