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

type DeviceType = "phone" | "tablet" | "desktop";

interface DeviceFrameProps {
  device?: DeviceType;
  delay?: number;
  children?: React.ReactNode;
  screenshotSrc?: string;
  scrollY?: number;
  style?: React.CSSProperties;
}

const DEVICE_SPECS = {
  phone: {
    width: 320,
    height: 640,
    borderRadius: 40,
    bezel: 12,
    notch: true,
  },
  tablet: {
    width: 540,
    height: 720,
    borderRadius: 28,
    bezel: 16,
    notch: false,
  },
  desktop: {
    width: 700,
    height: 440,
    borderRadius: 12,
    bezel: 8,
    notch: false,
  },
} as const;

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  device = "phone",
  delay = 0,
  children,
  screenshotSrc,
  scrollY = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spec = DEVICE_SPECS[device];

  const progress = spring({
    frame: frame - delay,
    fps,
    config: SPRING.snappy,
  });

  const scale = interpolate(progress, [0, 1], [0.8, 1]);
  const opacity = interpolate(progress, [0, 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });

  const scrollProgress = scrollY
    ? interpolate(frame - delay, [20, 80], [0, -scrollY], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        ...style,
      }}
    >
      {/* Device shell */}
      <div
        style={{
          width: spec.width + spec.bezel * 2,
          height:
            spec.height + spec.bezel * 2 + (device === "desktop" ? 32 : 0),
          borderRadius: spec.borderRadius,
          background: "#1a1a1a",
          padding: spec.bezel,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Desktop top bar */}
        {device === "desktop" && (
          <div
            style={{
              height: 28,
              display: "flex",
              alignItems: "center",
              gap: 6,
              paddingLeft: 10,
              paddingBottom: 4,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#ff5f57",
              }}
            />
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#ffbd2e",
              }}
            />
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#28c840",
              }}
            />
          </div>
        )}

        {/* Phone notch */}
        {spec.notch && (
          <div
            style={{
              position: "absolute",
              top: spec.bezel,
              left: "50%",
              transform: "translateX(-50%)",
              width: 120,
              height: 28,
              borderRadius: "0 0 16px 16px",
              background: "#1a1a1a",
              zIndex: 10,
            }}
          />
        )}

        {/* Screen content */}
        <div
          style={{
            width: spec.width,
            height: spec.height - (device === "desktop" ? 28 : 0),
            borderRadius: Math.max(4, spec.borderRadius - spec.bezel),
            overflow: "hidden",
            background: "#ffffff",
            position: "relative",
          }}
        >
          <div
            style={{
              transform: `translateY(${scrollProgress}px)`,
              width: "100%",
              minHeight: "100%",
            }}
          >
            {screenshotSrc ? (
              <Img
                src={
                  screenshotSrc.startsWith("http")
                    ? screenshotSrc
                    : staticFile(screenshotSrc)
                }
                style={{
                  width: "100%",
                  minHeight: spec.height,
                  objectFit: "cover",
                  objectPosition: "top center",
                  display: "block",
                }}
              />
            ) : (
              children
            )}
          </div>
        </div>
      </div>

      {/* Desktop stand */}
      {device === "desktop" && (
        <>
          <div
            style={{
              width: 60,
              height: 40,
              background: "linear-gradient(180deg, #2a2a2a, #1a1a1a)",
            }}
          />
          <div
            style={{
              width: 160,
              height: 8,
              borderRadius: 4,
              background: "#2a2a2a",
            }}
          />
        </>
      )}
    </div>
  );
};
