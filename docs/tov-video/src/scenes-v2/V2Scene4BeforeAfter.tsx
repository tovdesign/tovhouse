import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  OffthreadVideo,
  staticFile,
} from "remotion";
import { colors, TYPO, FONT } from "../tokens";
import { FadeIn, ClipReveal, BeforeAfter, SafeZone } from "../primitives";

interface Props {
  durationInFrames: number;
}

export const V2Scene4BeforeAfter: React.FC<Props> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {/* Background video */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <OffthreadVideo
          src={staticFile("img/v2/bg-video-4.mp4")}
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
        <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.8)" }} />
      </AbsoluteFill>

      <SafeZone format="reels" justify="center" gap={44}>
        {/* Section label */}
        <ClipReveal delay={5} direction="left">
          <div
            style={{
              fontSize: TYPO.caption,
              fontWeight: 600,
              color: colors.accent,
              fontFamily: FONT.mono,
              letterSpacing: 4,
              textTransform: "uppercase" as const,
            }}
          >
            RENOVATION RESULTS
          </div>
        </ClipReveal>

        {/* Title */}
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
            시공 전후 비교
          </div>
        </FadeIn>

        {/* BeforeAfter — ★ NEW PRIMITIVE: Kitchen */}
        <BeforeAfter
          beforeSrc="img/s1-empty-room.png"
          afterSrc="img/s5-kitchen.png"
          beforeLabel="시공 전"
          afterLabel="시공 후"
          delay={20}
          direction="horizontal"
          width={900}
          height={520}
        />

        {/* BeforeAfter — ★ NEW PRIMITIVE: Bathroom */}
        <BeforeAfter
          beforeSrc="img/s2-estimate.png"
          afterSrc="img/s5-bathroom.png"
          beforeLabel="BEFORE"
          afterLabel="AFTER"
          delay={55}
          direction="horizontal"
          width={900}
          height={520}
        />
      </SafeZone>
    </AbsoluteFill>
  );
};
