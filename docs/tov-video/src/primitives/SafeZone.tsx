import React from "react";
import { AbsoluteFill } from "remotion";

const SAFE_ZONES = {
  reels: { top: 280, bottom: 520, left: 60, right: 60 },
  feed: { top: 60, bottom: 60, left: 60, right: 60 },
} as const;

type Format = keyof typeof SAFE_ZONES;

interface SafeZoneProps {
  format?: Format;
  children: React.ReactNode;
  justify?: "center" | "space-between" | "flex-start" | "flex-end";
  gap?: number;
}

export const SafeZone: React.FC<SafeZoneProps> = ({
  format = "reels",
  children,
  justify = "center",
  gap = 40,
}) => {
  const z = SAFE_ZONES[format];
  return (
    <AbsoluteFill
      style={{
        padding: `${z.top}px ${z.right}px ${z.bottom}px ${z.left}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: justify,
        gap,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
