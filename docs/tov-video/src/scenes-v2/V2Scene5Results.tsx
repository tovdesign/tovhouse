import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { colors, TYPO, FONT } from "../tokens";
import { FadeIn, BounceIn, CountUp, Stagger, SafeZone } from "../primitives";

interface Props {
  durationInFrames: number;
}

const STATS = [
  { label: "평균 절감", value: 1200, suffix: "만원", color: colors.accent },
  { label: "고객 만족도", value: 98, suffix: "%", color: colors.accentLight },
  {
    label: "전체 시공내역서 전달",
    value: 100,
    suffix: "%",
    color: colors.accent,
  },
];

export const V2Scene5Results: React.FC<Props> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  const bgScale = interpolate(frame, [0, durationInFrames], [1.0, 1.1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {/* Background */}
      <AbsoluteFill style={{ transform: `scale(${bgScale})` }}>
        <Img
          src={staticFile("img/s5-kitchen.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.72)" }} />

      <SafeZone format="reels" justify="center" gap={52}>
        {/* Title */}
        <FadeIn delay={5} slideY={30}>
          <div
            style={{
              fontSize: TYPO.hero,
              fontWeight: 900,
              color: colors.white,
              fontFamily: FONT.main,
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            숫자로 증명합니다
          </div>
        </FadeIn>

        {/* Stat cards — stagger */}
        <Stagger interval={12}>
          {STATS.map((stat, i) => (
            <BounceIn key={i} delay={20 + i * 12}>
              <div
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 24,
                  padding: "36px 64px",
                  textAlign: "center",
                  border: "1px solid rgba(255,255,255,0.08)",
                  minWidth: 600,
                }}
              >
                <div
                  style={{
                    fontSize: TYPO.stat,
                    fontWeight: 900,
                    color: stat.color,
                    fontFamily: FONT.mono,
                    lineHeight: 1,
                  }}
                >
                  <CountUp
                    from={0}
                    to={stat.value}
                    delay={28 + i * 12}
                    duration={25}
                    suffix={stat.suffix}
                  />
                </div>
                <div
                  style={{
                    fontSize: TYPO.body,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.6)",
                    fontFamily: FONT.main,
                    marginTop: 8,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            </BounceIn>
          ))}
        </Stagger>
      </SafeZone>
    </AbsoluteFill>
  );
};
