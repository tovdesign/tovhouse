import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  OffthreadVideo,
  staticFile,
} from "remotion";
import { colors, TYPO, FONT } from "../tokens";
import {
  FadeIn,
  DeviceFrame,
  Underline,
  SafeZone,
  PopBadge,
} from "../primitives";

interface Props {
  durationInFrames: number;
}

export const V2Scene3Platform: React.FC<Props> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Subtle background gradient shift
  const gradAngle = interpolate(frame, [0, durationInFrames], [180, 195], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {/* Background video */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <OffthreadVideo
          src={staticFile("img/v2/bg-video-3.mp4")}
          volume={0}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            minWidth: 1200,
            minHeight: 2100,
            width: "auto",
            height: "auto",
          }}
        />
        <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.78)" }} />
      </AbsoluteFill>

      <SafeZone format="reels" justify="flex-start" gap={28}>
        {/* Title — moved up */}
        <FadeIn delay={5} slideY={30}>
          <div
            style={{
              fontSize: TYPO.title,
              fontWeight: 800,
              color: colors.white,
              fontFamily: FONT.main,
              textAlign: "center",
              lineHeight: 1.3,
              marginTop: -80,
            }}
          >
            <Underline delay={15} color={colors.accent} thickness={8}>
              투명한 견적
            </Underline>{" "}
            시스템
          </div>
        </FadeIn>

        {/* DeviceFrame — ★ NEW PRIMITIVE with inline UI */}
        <DeviceFrame
          device="phone"
          delay={20}
          scrollY={180}
          style={{
            transform: "scale(1.35)",
            transformOrigin: "top center",
            marginTop: 10,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: "100%",
              minHeight: 900,
              background: "#f8faf6",
              fontFamily: FONT.main,
              padding: "20px 16px",
            }}
          >
            {/* App header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: colors.accentDark,
                }}
              >
                토브디자인
              </div>
              <div style={{ fontSize: 11, color: "#999" }}>견적 상세</div>
            </div>

            {/* Estimate card */}
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#333",
                  marginBottom: 10,
                }}
              >
                주방 리모델링 견적서
              </div>
              {[
                { item: "싱크대 상판 (마블)", price: "1,200,000" },
                { item: "하부장 교체 (18mm)", price: "980,000" },
                { item: "타일 시공 (6㎡)", price: "540,000" },
                { item: "전기배선 (2회로)", price: "320,000" },
                { item: "인건비 (3일)", price: "750,000" },
              ].map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid #f0f0f0",
                    fontSize: 11,
                    color: "#555",
                  }}
                >
                  <span>{row.item}</span>
                  <span style={{ fontWeight: 600, color: "#333" }}>
                    ₩{row.price}
                  </span>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 0 4px",
                  fontSize: 14,
                  fontWeight: 800,
                  color: colors.accentDark,
                }}
              >
                <span>합계</span>
                <span>₩3,790,000</span>
              </div>
            </div>

            {/* Transparency badge */}
            <div
              style={{
                background: colors.accentDark,
                color: "#fff",
                borderRadius: 8,
                padding: "10px 16px",
                fontSize: 12,
                fontWeight: 600,
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              ✓ 원가 100% 공개 · 마진 0%
            </div>

            {/* Receipt section */}
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#333",
                  marginBottom: 8,
                }}
              >
                증빙 서류
              </div>
              {["자재 영수증", "인건비 입금증", "시공 사진 기록"].map(
                (doc, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 0",
                      fontSize: 11,
                      color: "#666",
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        background: colors.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: "#fff",
                      }}
                    >
                      ✓
                    </div>
                    {doc}
                  </div>
                ),
              )}
            </div>
          </div>
        </DeviceFrame>

        {/* Feature badges */}
        <div
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {["원가 공개", "실시간 견적", "자재 선택"].map((text, i) => (
            <PopBadge key={i} delay={65 + i * 12}>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: colors.white,
                  fontFamily: FONT.main,
                  padding: "18px 40px",
                  borderRadius: 44,
                  background: `linear-gradient(135deg, ${colors.accentDark}, ${colors.accent})`,
                  boxShadow: "0 4px 20px rgba(125,184,94,0.3)",
                }}
              >
                {text}
              </div>
            </PopBadge>
          ))}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};
