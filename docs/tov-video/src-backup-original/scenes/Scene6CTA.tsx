import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

export const Scene6CTA: React.FC = () => {
  const frame = useCurrentFrame();
  // 4초 = 120 프레임

  const sceneOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const bgScale = interpolate(frame, [0, 120], [1.0, 1.06], {
    extrapolateRight: "clamp",
  });

  // 리드카피
  const leadOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // 메인카피 스케일인
  const mainScale = interpolate(frame, [30, 50], [0.7, 1.0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const mainOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // CTA 버튼 바운스
  const btnOpacity = interpolate(frame, [55, 65], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const btnScale = interpolate(
    frame,
    [55, 65, 72, 78],
    [0.6, 1.1, 0.95, 1.0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  // CTA 펄스 (반복)
  const pulseFrame = frame > 80 ? (frame - 80) % 30 : 0;
  const pulseScale = frame > 80
    ? interpolate(pulseFrame, [0, 15, 30], [1.0, 1.04, 1.0])
    : 1;

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {/* 배경 */}
      <AbsoluteFill style={{ transform: `scale(${bgScale})` }}>
        <Img
          src={staticFile("img/s6-cta.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.62)" }} />

      {/* 콘텐츠 */}
      <AbsoluteFill
        style={{
          padding: "280px 60px 520px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
        }}
      >
        {/* 리드카피 */}
        <div
          style={{
            fontSize: 64,
            color: "rgba(255,255,255,0.75)",
            fontWeight: 400,
            textAlign: "center",
            fontFamily: "Pretendard",
            opacity: leadOpacity,
          }}
        >
          견적 비교,
          <br />더 이상 어렵지 않습니다
        </div>

        {/* 메인카피 */}
        <div
          style={{
            fontSize: 130,
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            fontFamily: "Pretendard",
            opacity: mainOpacity,
            transform: `scale(${mainScale})`,
          }}
        >
          무료 견적 상담
        </div>

        {/* CTA 버튼 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: "#649a46",
            color: "white",
            fontSize: 62,
            fontWeight: 700,
            padding: "40px 96px",
            borderRadius: 60,
            marginTop: 16,
            fontFamily: "Pretendard",
            opacity: btnOpacity,
            transform: `scale(${btnScale * pulseScale})`,
          }}
        >
          지금 상담받기
          <svg
            viewBox="0 0 24 24"
            width="42"
            height="42"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
