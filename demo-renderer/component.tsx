// This file is overwritten at render time by Claude-generated code.
// It must export: Demo (default React component), DURATION_IN_FRAMES, FPS.
import React from 'react';
import { useCurrentFrame } from 'remotion';

export const FPS = 30;
export const DURATION_IN_FRAMES = 30 * 20; // 20 seconds placeholder

export const Demo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ width: 1280, height: 720, background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
      Frame {frame}
    </div>
  );
};

export default Demo;
