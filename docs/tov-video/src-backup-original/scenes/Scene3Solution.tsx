import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

export const Scene3Solution: React.FC = () => {
  const frame = useCurrentFrame();
  // 5초 = 150 프레임

  // 씬 페이드인
  const sceneOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Ken Burns
  const bgScale = interpolate(frame, [0, 150], [1.0, 1.08], {
    extrapolateRight: "clamp",
  });

  // 로고 스케일인
  const logoScale = interpolate(frame, [10, 35], [0.5, 1.0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const logoOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // 메인카피 슬라이드업
  const mainY = interpolate(frame, [35, 60], [50, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const mainOpacity = interpolate(frame, [35, 55], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // "전부 공개" 강조
  const greenPulse = interpolate(
    frame,
    [60, 72, 84],
    [1.0, 1.08, 1.0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  // 서브카피 페이드인
  const subOpacity = interpolate(frame, [80, 100], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {/* 배경 */}
      <AbsoluteFill style={{ transform: `scale(${bgScale})` }}>
        <Img
          src={staticFile("img/s3-planning.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.58)" }} />

      {/* 콘텐츠 */}
      <AbsoluteFill
        style={{
          padding: "280px 60px 520px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
        }}
      >
        {/* 로고 */}
        <Img
          src={staticFile("logo.png")}
          style={{
            width: 260,
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
            filter: "brightness(10)",
          }}
        />

        {/* 메인카피 */}
        <div
          style={{
            textAlign: "center",
            transform: `translateY(${mainY}px)`,
            opacity: mainOpacity,
          }}
        >
          <div
            style={{
              fontSize: 120,
              fontWeight: 800,
              lineHeight: 1.35,
              letterSpacing: -2,
              color: "white",
              fontFamily: "Pretendard",
            }}
          >
            시공자재 · 인건비
            <br />
            원가 집행내역
            <br />
            <span
              style={{
                color: "#7db85e",
                display: "inline-block",
                transform: `scale(${greenPulse})`,
              }}
            >
              전부 공개
            </span>
            합니다
          </div>
        </div>

        {/* 서브카피 */}
        <div
          style={{
            fontSize: 58,
            fontWeight: 400,
            color: "rgba(255,255,255,0.8)",
            lineHeight: 1.5,
            textAlign: "center",
            fontFamily: "Pretendard",
            opacity: subOpacity,
          }}
        >
          실행원가부터 집행내역까지
          <br />
          투명하게 공개합니다
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
