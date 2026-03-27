import { Composition } from "remotion";
import { TovVideo } from "./TovVideo";
import { TovShowcase } from "./TovShowcase";
import { TovProcess } from "./TovProcess";
import { TOTAL_FRAMES, FPS } from "./tokens";
import { V2_TOTAL, FPS as V2_FPS } from "./tokens-v2";
import { V3_TOTAL, FPS as V3_FPS } from "./tokens-v3";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TovDesign1"
        component={TovVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="TovDesign2"
        component={TovShowcase}
        durationInFrames={V2_TOTAL}
        fps={V2_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="TovHouse1"
        component={TovProcess}
        durationInFrames={V3_TOTAL}
        fps={V3_FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
