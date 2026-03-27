import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

export const Scene7Ending: React.FC = () => {
  const frame = useCurrentFrame();
  // 5초 = 150 프레임

  // 배경 페이드인 (다크 → 그린)
  const bgOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // 로고 페이드인 + 스케일인
  const logoOpacity = interpolate(frame, [10, 40], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const logoScale = interpolate(frame, [10, 40], [0.6, 1.0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // URL 페이드인
  const urlOpacity = interpolate(frame, [40, 65], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // 마지막 페이드아웃 (선택 - 자연스러운 마무리)
  const fadeOut = interpolate(frame, [130, 150], [1, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#649a46", opacity: bgOpacity }}>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          opacity: fadeOut,
        }}
      >
        {/* 로고 */}
        <Img
          src={staticFile("logo.png")}
          style={{
            width: 450,
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
          }}
        />

        {/* URL */}
        <div
          style={{
            fontSize: 52,
            fontFamily: "Montserrat",
            fontWeight: 500,
            color: "rgba(255,255,255,0.7)",
            letterSpacing: 2,
            opacity: urlOpacity,
          }}
        >
          tovdesign.imweb.me
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
