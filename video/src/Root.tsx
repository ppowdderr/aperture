import { Composition } from "remotion";
import { VIDEO } from "./content";
import { Main } from "./Main";

export const RemotionRoot: React.FC = () => {
  return <Composition
    id="Main"
    component={Main}
    durationInFrames={VIDEO.durationInFrames}
    fps={VIDEO.fps}
    width={VIDEO.width}
    height={VIDEO.height}
  />;
};
