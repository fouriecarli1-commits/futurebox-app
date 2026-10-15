/**
 * The neural amp binary, into public/.
 *
 * Emscripten fetches its own .wasm beside whatever script loaded it. The app's
 * content policy allows `connect-src 'self'` and Supabase and nothing else, so
 * a fetch anywhere else is refused with no visible error and the amp simply
 * never loads. Serving it from our own origin is the fix, and copying it here
 * rather than committing it keeps one copy of the bytes: the package's.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('public/nam', { recursive: true });
copyFileSync('node_modules/@opendaw/nam-wasm/dist/nam.wasm', 'public/nam/nam.wasm');
console.log('nam.wasm → public/nam/nam.wasm');

/**
 * The picture engine's wasm, into public/vision/, for the same reason.
 *
 * The background remover (`app/lib/cutout.ts`) runs MediaPipe's image
 * segmenter, and its loader fetches these beside the path it is given. Copied
 * rather than committed: 13 MB each, and the package already holds them.
 * The model itself is small enough to sit in public/segment/.
 */
mkdirSync('public/vision', { recursive: true });
for (const name of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']) {
  copyFileSync(`node_modules/@mediapipe/tasks-vision/wasm/${name}`, `public/vision/${name}`);
}
console.log('tasks-vision wasm → public/vision/');
