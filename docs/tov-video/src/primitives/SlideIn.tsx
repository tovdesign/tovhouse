import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { SPRING } from "../tokens";

type Direction = "left" | "right" | "top" | "bottom";

interface SlideInProps {
  children: React.ReactNode;
  delay?: number;
  direction?: Direction;
  distance?: number;
  springConfig?: keyof typeof SPRING;
  style?: React.CSSProperties;
}

const getTransform = (direction: Direction, distance: number) => {
  switch (direction) {
    case "left":
      return (v: number) =>
        `translateX(${interpolate(v, [0, 1], [-distance, 0])}px)`;
    case "right":
      return (v: number) =>
        `translateX(${interpolate(v, [0, 1], [distance, 0])}px)`;
    case "top":
      return (v: number) =>
        `translateY(${interpolate(v, [0, 1], [-distance, 0])}px)`;
    case "bottom":
      return (v: number) =>
        `translateY(${interpolate(v, [0, 1], [distance, 0])}px)`;
  }
};

export const SlideIn: React.FC<SlideInProps> = ({
  children,
  delay = 0,
  direction = "left",
  distance = 80,
  springConfig = "snappy",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: SPRING[springConfig],
  });

  const transformFn = getTransform(direction, distance);

  return (
    <div
      style={{
        opacity: interpolate(progress, [0, 1], [0, 1]),
        transform: transformFn(progress),
        ...style,
      }}
    >
      {children}
    </div>
  );
};
