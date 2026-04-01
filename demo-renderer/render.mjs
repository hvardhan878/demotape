import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

mkdirSync(resolve(__dirname, 'out'), { recursive: true });

console.log('[remotion] Bundling composition...');
const bundled = await bundle({
  entryPoint: resolve(__dirname, 'src/index.tsx'),
  webpackOverride: (config) => config,
});

console.log('[remotion] Selecting composition...');
const composition = await selectComposition({
  serveUrl: bundled,
  id: 'Demo',
  inputProps: {},
});

console.log(`[remotion] Rendering ${composition.durationInFrames} frames @ ${composition.fps}fps...`);
await renderMedia({
  codec: 'h264',
  composition,
  serveUrl: bundled,
  outputLocation: resolve(__dirname, 'out/demo.mp4'),
  crf: 15,
  x264Preset: 'slow',
  chromiumOptions: {
    enableMultiProcessOnLinux: true,
  },
  inputProps: {},
  onProgress: ({ renderedFrames, encodedFrames, stitchStage }) => {
    if (renderedFrames % 30 === 0) {
      console.log(`[remotion] rendered=${renderedFrames}/${composition.durationInFrames} encoded=${encodedFrames} stage=${stitchStage}`);
    }
  },
});

console.log('[remotion] Done → out/demo.mp4');
