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
  ClipReveal,
  ChecklistItem,
  ProgressBar,
  SafeZone,
} from "../primitives";

interface Props {
  durationInFrames: number;
}

const STEPS = [
  "무료 상담 · 현장 방문",
  "투명 견적서 발행 (원가 100% 공개)",
  "자재 선택 · 시공 일정 확정",
  "시공 진행 · 실시간 현장 보고",
  "시공북 전달 · 증빙 서류 완료",
];

export const V3Scene3Process: React.FC<Props> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  // ProgressBar — overall progress animation
  const progressValue = interpolate(
    frame,
    [30, durationInFrames - 20],
    [0, 100],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
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
        <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.82)" }} />
      </AbsoluteFill>

      <SafeZone format="reels" justify="flex-start" gap={28}>
        <ClipReveal delay={5} direction="left">
          <div
            style={{
              fontSize: TYPO.caption,
              fontWeight: 600,
              color: colors.accent,
              fontFamily: FONT.mono,
              letterSpacing: 4,
              textTransform: "uppercase" as const,
              marginTop: -100,
            }}
          >
            OUR PROCESS
          </div>
        </ClipReveal>

        <FadeIn delay={10} slideY={30}>
          <div
            style={{
              fontSize: TYPO.title,
              fontWeight: 800,
              color: colors.white,
              fontFamily: FONT.main,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            5단계 시공 프로세스
          </div>
        </FadeIn>

        {/* ChecklistItem — ★ bigger text */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 36,
              alignItems: "flex-start",
            }}
          >
            {STEPS.map((text, i) => (
              <ChecklistItem
                key={i}
                text={text}
                delay={25 + i * 18}
                checkColor={colors.accent}
                textStyle={{
                  fontSize: TYPO.subtitle,
                  fontFamily: FONT.main,
                }}
              />
            ))}
          </div>
        </div>

        {/* ProgressBar — pushed down */}
        <FadeIn delay={20} slideY={0}>
          <ProgressBar
            progress={progressValue}
            delay={0}
            height={32}
            color={colors.accent}
            label="시공 진행률"
            labelStyle={{
              fontSize: 36,
              fontWeight: 600,
              color: colors.white,
              fontFamily: FONT.main,
            }}
            style={{ width: 860, marginTop: 60 }}
          />
        </FadeIn>
      </SafeZone>
    </AbsoluteFill>
  );
};
