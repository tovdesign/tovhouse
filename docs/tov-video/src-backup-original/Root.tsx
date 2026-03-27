import { Composition } from "remotion";
import { TovVideo } from "./TovVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TovHouse"
        component={TovVideo}
        durationInFrames={960} // 32s * 30fps
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
