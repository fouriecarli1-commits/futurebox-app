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
