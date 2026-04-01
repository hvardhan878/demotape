import { Composition } from 'remotion';
import { Demo, DURATION_IN_FRAMES, FPS } from '../component';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Demo"
      component={Demo}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={1280}
      height={720}
    />
  );
};
