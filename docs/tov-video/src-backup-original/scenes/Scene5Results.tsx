import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

export const Scene5Results: React.FC = () => {
  const frame = useCurrentFrame();
  // 5초 = 150 프레임

  const sceneOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // 상단(주방) 등장
  const topY = interpolate(frame, [5, 30], [-960, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // 하단(욕실) 등장
  const bottomY = interpolate(frame, [15, 40], [960, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Ken Burns - 주방
  const kitchenScale = interpolate(frame, [0, 150], [1.05, 1.15], {
    extrapolateRight: "clamp",
  });

  // Ken Burns - 욕실
  const bathScale = interpolate(frame, [0, 150], [1.15, 1.05], {
    extrapolateRight: "clamp",
  });

  // 센터 텍스트
  const centerOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const centerScale = interpolate(frame, [40, 60], [0.8, 1.0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {/* 상단 - 주방 */}
      <AbsoluteFill
        style={{
          height: "50%",
          overflow: "hidden",
          transform: `translateY(${topY}px)`,
        }}
      >
        <AbsoluteFill style={{ transform: `scale(${kitchenScale})` }}>
          <Img
            src={staticFile("img/s5-kitchen.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
        <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.40)" }} />
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 40,
            fontSize: 42,
            fontWeight: 600,
            color: "rgba(255,255,255,0.7)",
            textTransform: "uppercase" as const,
            letterSpacing: 3,
            fontFamily: "Montserrat",
          }}
        >
          KITCHEN
        </div>
      </AbsoluteFill>

      {/* 하단 - 욕실 */}
      <AbsoluteFill
        style={{
          top: "50%",
          height: "50%",
          overflow: "hidden",
          transform: `translateY(${bottomY}px)`,
        }}
      >
        <AbsoluteFill style={{ transform: `scale(${bathScale})` }}>
          <Img
            src={staticFile("img/s5-bathroom.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
        <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.40)" }} />
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 40,
            fontSize: 42,
            fontWeight: 600,
            color: "rgba(255,255,255,0.7)",
            textTransform: "uppercase" as const,
            letterSpacing: 3,
            fontFamily: "Montserrat",
          }}
        >
          BATHROOM
        </div>
      </AbsoluteFill>

      {/* 분할선 */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: 2,
          background: "rgba(255,255,255,0.15)",
          transform: "translateY(-50%)",
          zIndex: 5,
        }}
      />

      {/* 센터 텍스트 */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        <div
          style={{
            textAlign: "center",
            opacity: centerOpacity,
            transform: `scale(${centerScale})`,
          }}
        >
          <div
            style={{
              fontSize: 110,
              fontWeight: 800,
              color: "white",
              fontFamily: "Pretendard",
              textShadow: "0 2px 24px rgba(0,0,0,0.7)",
            }}
          >
            투명한 견적,
            <br />
            확실한 시공
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
