import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { SPRING } from "../tokens";

interface BarItem {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarItem[];
  delay?: number;
  stagger?: number;
  maxHeight?: number;
  barWidth?: number;
  gap?: number;
  defaultColor?: string;
  labelStyle?: React.CSSProperties;
  style?: React.CSSProperties;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  delay = 0,
  stagger = 5,
  maxHeight = 300,
  barWidth = 80,
  gap = 24,
  defaultColor = "#649a46",
  labelStyle,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap,
        ...style,
      }}
    >
      {data.map((item, i) => {
        const barDelay = delay + i * stagger;
        const progress = spring({
          frame: frame - barDelay,
          fps,
          config: SPRING.gentle,
        });

        const targetHeight = (item.value / maxValue) * maxHeight;
        const barHeight = interpolate(progress, [0, 1], [0, targetHeight]);
        const opacity = interpolate(progress, [0, 0.3], [0, 1], {
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              opacity,
            }}
          >
            <div
              style={{
                width: barWidth,
                height: barHeight,
                borderRadius: 8,
                background: item.color || defaultColor,
              }}
            />
            <div
              style={{
                fontSize: 28,
                fontWeight: 500,
                color: "rgba(255,255,255,0.7)",
                textAlign: "center",
                whiteSpace: "pre-wrap",
                ...labelStyle,
              }}
            >
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};
