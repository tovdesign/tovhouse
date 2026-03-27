import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

const ITEMS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    text: "영수증 · 입금증 ·\n항목별 지출 증빙",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    text: "양도소득세\n필요경비 증빙 가능",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    text: "모든 시공자재,\n고객이 직접 선택",
  },
];

export const Scene4Proof: React.FC = () => {
  const frame = useCurrentFrame();
  // 5초 = 150 프레임

  const sceneOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const bgScale = interpolate(frame, [0, 150], [1.0, 1.06], {
    extrapolateRight: "clamp",
  });

  // 타이틀 등장
  const titleOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const titleScale = interpolate(frame, [10, 30], [0.85, 1.0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {/* 배경 */}
      <AbsoluteFill style={{ transform: `scale(${bgScale})` }}>
        <Img
          src={staticFile("img/s4-estimate-detail.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.65)" }} />

      {/* 콘텐츠 */}
      <AbsoluteFill
        style={{
          padding: "280px 60px 520px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 60,
        }}
      >
        {/* 타이틀 */}
        <div
          style={{
            textAlign: "center",
            opacity: titleOpacity,
            transform: `scale(${titleScale})`,
          }}
        >
          <div
            style={{
              fontSize: 120,
              fontWeight: 800,
              color: "#7db85e",
              fontFamily: "Pretendard",
              marginBottom: 16,
            }}
          >
            시공북 제공
          </div>
          <div
            style={{
              fontSize: 54,
              color: "rgba(255,255,255,0.6)",
              fontFamily: "Pretendard",
            }}
          >
            모든 내역을 투명하게 증빙
          </div>
        </div>

        {/* 항목 3개 순차 등장 - 그룹 중앙정렬 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 32,
            alignItems: "center",
            width: "100%",
          }}
        >
          {ITEMS.map((item, i) => {
            const startFrame = 40 + i * 21; // 0.7초 간격
            const itemOpacity = interpolate(
              frame,
              [startFrame, startFrame + 15],
              [0, 1],
              { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
            );
            const itemX = interpolate(
              frame,
              [startFrame, startFrame + 15],
              [-40, 0],
              { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
            );

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 28,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(100,154,70,0.25)",
                  borderRadius: 20,
                  padding: "36px 48px",
                  width: 820,
                  opacity: itemOpacity,
                  transform: `translateX(${itemX}px)`,
                }}
              >
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, #649a46, #7db85e)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <div
                  style={{
                    fontSize: 64,
                    fontWeight: 600,
                    color: "white",
                    fontFamily: "Pretendard",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {item.text}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
