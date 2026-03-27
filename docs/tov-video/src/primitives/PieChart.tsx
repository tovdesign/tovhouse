import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { SPRING } from "../tokens";

interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieSlice[];
  delay?: number;
  size?: number;
  strokeWidth?: number;
  showLabels?: boolean;
  labelStyle?: React.CSSProperties;
  style?: React.CSSProperties;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  delay = 0,
  size = 300,
  strokeWidth = 60,
  showLabels = true,
  labelStyle,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: SPRING.gentle,
  });

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulated = 0;
  const slices = data.map((item) => {
    const fraction = item.value / total;
    const dashLength = fraction * circumference;
    const dashOffset = accumulated * circumference;
    accumulated += fraction;
    return { ...item, fraction, dashLength, dashOffset };
  });

  const drawProgress = interpolate(progress, [0, 1], [0, 1]);
  const opacity = interpolate(progress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 40,
        opacity,
        ...style,
      }}
    >
      <svg
        width={size}
        height={size}
        style={{
          transform: "rotate(-90deg)",
        }}
      >
        {slices.map((slice, i) => {
          const visibleLength = slice.dashLength * drawProgress;
          return (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${visibleLength} ${circumference - visibleLength}`}
              strokeDashoffset={-slice.dashOffset * drawProgress}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>

      {showLabels && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {slices.map((slice, i) => {
            const labelProgress = spring({
              frame: frame - delay - 10 - i * 5,
              fps,
              config: SPRING.snappy,
            });
            const labelOpacity = interpolate(labelProgress, [0, 0.5], [0, 1], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  opacity: labelOpacity,
                  transform: `translateX(${interpolate(labelProgress, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: slice.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.85)",
                    whiteSpace: "nowrap",
                    ...labelStyle,
                  }}
                >
                  {slice.label} ({Math.round(slice.fraction * 100)}%)
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
