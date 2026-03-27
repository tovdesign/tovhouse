import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  // 4초 = 120 프레임

  // 배경 페이드인
  const bgOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Ken Burns 줌
  const bgScale = interpolate(frame, [0, 120], [1.0, 1.08], {
    extrapolateRight: "clamp",
  });

  // 메인 텍스트 슬라이드업
  const mainY = interpolate(frame, [10, 35], [60, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const mainOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  // "투명하게 모두공개" 강조 펄스
  const greenScale = interpolate(
    frame,
    [35, 45, 55],
    [0.95, 1.05, 1.0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  // 서브 후킹 페이드인
  const subOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const subY = interpolate(frame, [50, 70], [30, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill>
      {/* 배경 이미지 */}
      <AbsoluteFill
        style={{
          opacity: bgOpacity,
          transform: `scale(${bgScale})`,
        }}
      >
        <Img
          src={staticFile("img/s1-empty-room.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </AbsoluteFill>

      {/* 오버레이 */}
      <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.65)" }} />

      {/* 콘텐츠 - 세이프존 내 */}
      <AbsoluteFill
        style={{
          padding: "280px 60px 520px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* 메인 텍스트 */}
        <div
          style={{
            textAlign: "center",
            transform: `translateY(${mainY}px)`,
            opacity: mainOpacity,
          }}
        >
          <div
            style={{
              fontSize: 130,
              fontWeight: 800,
              lineHeight: 1.3,
              letterSpacing: -3,
              color: "white",
              fontFamily: "Pretendard",
            }}
          >
            인테리어 원가
          </div>
          <div
            style={{
              fontSize: 130,
              fontWeight: 800,
              lineHeight: 1.3,
              letterSpacing: -3,
              color: "#7db85e",
              fontFamily: "Pretendard",
              transform: `scale(${greenScale})`,
            }}
          >
            투명하게 모두공개
          </div>
        </div>

        {/* 서브 후킹 */}
        <div
          style={{
            textAlign: "center",
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
          }}
        >
          <div
            style={{
              fontSize: 62,
              fontWeight: 500,
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.75)",
              fontFamily: "Pretendard",
            }}
          >
            수천만원 더주면서
            <br />
            인테리어 리모델링
            <br />
            하기 싫다면{" "}
            <span style={{ color: "#fff", fontWeight: 700 }}>꼭 확인</span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
