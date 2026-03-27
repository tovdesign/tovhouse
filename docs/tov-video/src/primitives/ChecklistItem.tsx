import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { SPRING } from "../tokens";

interface ChecklistItemProps {
  text: string;
  delay?: number;
  checkColor?: string;
  textStyle?: React.CSSProperties;
  style?: React.CSSProperties;
}

export const ChecklistItem: React.FC<ChecklistItemProps> = ({
  text,
  delay = 0,
  checkColor = "#649a46",
  textStyle,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Text slides in
  const textProgress = spring({
    frame: frame - delay,
    fps,
    config: SPRING.gentle,
  });

  // Checkmark pops in slightly after text
  const checkProgress = spring({
    frame: frame - delay - 8,
    fps,
    config: { damping: 6, stiffness: 150, mass: 0.6 },
  });

  const checkScale = interpolate(checkProgress, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
  });
  const textOpacity = interpolate(textProgress, [0, 1], [0, 1]);
  const textX = interpolate(textProgress, [0, 1], [30, 0]);

  // SVG checkmark stroke draw
  const strokeDash = interpolate(checkProgress, [0, 1], [24, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        opacity: textOpacity,
        ...style,
      }}
    >
      {/* Checkmark circle */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          backgroundColor: checkColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transform: `scale(${checkScale})`,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="28"
          height="28"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline
            points="6 12 10 16 18 8"
            strokeDasharray="24"
            strokeDashoffset={strokeDash}
          />
        </svg>
      </div>

      {/* Text */}
      <div
        style={{
          transform: `translateX(${textX}px)`,
          fontSize: 48,
          fontWeight: 600,
          color: "white",
          ...textStyle,
        }}
      >
        {text}
      </div>
    </div>
  );
};
