import React from "react";
import {
  spring,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
} from "remotion";
import { SPRING } from "../tokens";

interface BeforeAfterProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  delay?: number;
  direction?: "horizontal" | "vertical";
  width?: number;
  height?: number;
  labelStyle?: React.CSSProperties;
  style?: React.CSSProperties;
}

export const BeforeAfter: React.FC<BeforeAfterProps> = ({
  beforeSrc,
  afterSrc,
  beforeLabel = "BEFORE",
  afterLabel = "AFTER",
  delay = 0,
  direction = "horizontal",
  width = 900,
  height = 600,
  labelStyle,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterProgress = spring({
    frame: frame - delay,
    fps,
    config: SPRING.gentle,
  });

  const revealProgress = spring({
    frame: frame - delay - 15,
    fps,
    config: { damping: 25, stiffness: 100 },
  });

  const opacity = interpolate(enterProgress, [0, 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });
  const scale = interpolate(enterProgress, [0, 1], [0.9, 1]);

  const dividerPos = interpolate(revealProgress, [0, 1], [0, 50]);

  const isHorizontal = direction === "horizontal";
  const halfW = isHorizontal ? width / 2 : width;
  const halfH = isHorizontal ? height : height / 2;

  const resolveSrc = (src: string) =>
    src.startsWith("http") ? src : staticFile(src);

  const labelBase: React.CSSProperties = {
    position: "absolute",
    fontSize: 36,
    fontWeight: 700,
    letterSpacing: 3,
    textTransform: "uppercase",
    padding: "8px 20px",
    borderRadius: 8,
    ...labelStyle,
  };

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        width,
        height,
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        borderRadius: 20,
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
        ...style,
      }}
    >
      {/* Before side */}
      <div
        style={{
          width: halfW,
          height: halfH,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Img
          src={resolveSrc(beforeSrc)}
          style={{
            width,
            height,
            objectFit: "cover",
          }}
        />
        <div
          style={{
            ...labelBase,
            bottom: 16,
            left: 16,
            background: "rgba(0,0,0,0.7)",
            color: "#ff6b6b",
          }}
        >
          {beforeLabel}
        </div>
      </div>

      {/* Divider line */}
      <div
        style={{
          position: "absolute",
          zIndex: 5,
          ...(isHorizontal
            ? {
                left: `${dividerPos}%`,
                top: 0,
                width: 4,
                height: "100%",
              }
            : {
                top: `${dividerPos}%`,
                left: 0,
                height: 4,
                width: "100%",
              }),
          background: "#ffffff",
          boxShadow: "0 0 12px rgba(255,255,255,0.6)",
        }}
      />

      {/* After side */}
      <div
        style={{
          width: halfW,
          height: halfH,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Img
          src={resolveSrc(afterSrc)}
          style={{
            width,
            height,
            objectFit: "cover",
            ...(isHorizontal ? { marginLeft: -halfW } : { marginTop: -halfH }),
          }}
        />
        <div
          style={{
            ...labelBase,
            bottom: 16,
            right: 16,
            background: "rgba(0,0,0,0.7)",
            color: "#51cf66",
          }}
        >
          {afterLabel}
        </div>
      </div>
    </div>
  );
};
