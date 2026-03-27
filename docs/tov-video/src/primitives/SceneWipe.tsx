import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { SPRING } from "../tokens";

type WipeDirection = "left" | "right" | "top" | "bottom" | "circle";

interface SceneWipeProps {
  children: React.ReactNode;
  delay?: number;
  direction?: WipeDirection;
  color?: string;
}

export const SceneWipe: React.FC<SceneWipeProps> = ({
  children,
  delay = 0,
  direction = "left",
  color = "#1a1a1a",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: wipe cover comes in
  const coverProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 180 },
  });

  // Phase 2: wipe cover exits, content revealed
  const revealProgress = spring({
    frame: frame - delay - 8,
    fps,
    config: { damping: 20, stiffness: 180 },
  });

  const getWipeCover = () => {
    if (direction === "circle") {
      const radius = interpolate(coverProgress, [0, 1], [0, 150]);
      const revealRadius = interpolate(revealProgress, [0, 1], [0, 150]);
      return {
        clipPath:
          revealProgress > 0.01
            ? `circle(${revealRadius}% at 50% 50%)`
            : `circle(${radius}% at 50% 50%)`,
      };
    }

    const coverPct = interpolate(coverProgress, [0, 1], [0, 100]);
    const revealPct = interpolate(revealProgress, [0, 1], [0, 100]);

    switch (direction) {
      case "left":
        return {
          clipPath: `inset(0 ${100 - coverPct}% 0 ${revealPct}%)`,
        };
      case "right":
        return {
          clipPath: `inset(0 ${revealPct}% 0 ${100 - coverPct}%)`,
        };
      case "top":
        return {
          clipPath: `inset(${revealPct}% 0 ${100 - coverPct}% 0)`,
        };
      case "bottom":
        return {
          clipPath: `inset(${100 - coverPct}% 0 ${revealPct}% 0)`,
        };
    }
  };

  return (
    <>
      {/* Content underneath */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: revealProgress > 0.01 ? 1 : 0,
        }}
      >
        {children}
      </div>

      {/* Wipe cover */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: color,
          ...getWipeCover(),
          zIndex: 20,
          pointerEvents: "none",
        }}
      />
    </>
  );
};
