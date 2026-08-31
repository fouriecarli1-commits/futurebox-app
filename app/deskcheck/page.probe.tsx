'use client';
/** Mounts the video desk on its own, for .probe/canvas.mjs. PROBE=1 only. */
import VideoCanvas from '@/app/components/VideoCanvas';
export default function CanvasProbe() {
  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <VideoCanvas />
    </div>
  );
}
