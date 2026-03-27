import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

export const Scene2Reality: React.FC = () => {
  const frame = useCurrentFrame();
  // 4초 = 120 프레임

  // 씬 전환 페이드인
  const sceneOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Ken Burns
  const bgScale = interpolate(frame, [0, 120], [1.0, 1.06], {
    extrapolateRight: "clamp",
  });

  // 라인1: "견적서 금액 = 원가 + 마진" 타이핑 효과 (글자 단위)
  const line1Text = "견적서 금액\n= 원가 + 마진";
  const line1Chars = interpolate(frame, [10, 50], [0, line1Text.length], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // 라인2: "그런데"
  const line2Opacity = interpolate(frame, [55, 65], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // 라인3: "원가를 공개하는 업체"
  const line3Opacity = interpolate(frame, [70, 82], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const line3Y = interpolate(frame, [70, 82], [20, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // "거의 없습니다" 스케일업 강조
  const emphasisScale = interpolate(frame, [85, 100], [0.7, 1.0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const emphasisOpacity = interpolate(frame, [85, 95], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {/* 배경 */}
      <AbsoluteFill style={{ transform: `scale(${bgScale})` }}>
        <Img
          src={staticFile("img/s2-estimate.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.72)" }} />

      {/* 콘텐츠 */}
      <AbsoluteFill
        style={{
          padding: "280px 80px 520px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          {/* 라인1 - 타이핑 */}
          <div
            style={{
              fontSize: 100,
              fontWeight: 600,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.92)",
              paddingLeft: 44,
              borderLeft: "7px solid #649a46",
              fontFamily: "Pretendard",
              whiteSpace: "pre-wrap",
            }}
          >
            {line1Text.slice(0, Math.floor(line1Chars))}
            {Math.floor(line1Chars) < line1Text.length && (
              <span
                style={{
                  opacity: frame % 10 < 5 ? 1 : 0,
                  color: "#7db85e",
                }}
              >
                |
              </span>
            )}
          </div>

          {/* 라인2 */}
          <div
            style={{
              fontSize: 100,
              fontWeight: 600,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.92)",
              paddingLeft: 44,
              borderLeft: "7px solid #649a46",
              fontFamily: "Pretendard",
              opacity: line2Opacity,
            }}
          >
            그런데
          </div>

          {/* 라인3 */}
          <div
            style={{
              paddingLeft: 44,
              borderLeft: "7px solid #649a46",
              opacity: line3Opacity,
              transform: `translateY(${line3Y}px)`,
            }}
          >
            <div
              style={{
                fontSize: 100,
                fontWeight: 600,
                lineHeight: 1.35,
                color: "rgba(255,255,255,0.92)",
                fontFamily: "Pretendard",
              }}
            >
              원가를 공개하는 업체
            </div>
            <div
              style={{
                fontSize: 84,
                fontWeight: 800,
                color: "#7db85e",
                fontFamily: "Pretendard",
                transform: `scale(${emphasisScale})`,
                opacity: emphasisOpacity,
                transformOrigin: "left center",
              }}
            >
              거의 없습니다
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
