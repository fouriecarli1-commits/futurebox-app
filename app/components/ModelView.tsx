'use client';

/**
 * A 3D model on the screen, turned round with a finger.
 *
 * What `Make it 3D` hands back (`lib/becomes.ts`) is a GLB file. three.js
 * is loaded only when one is shown, so the rest of the app never carries
 * it. The model turns slowly by itself until somebody touches it, which is
 * what tells a person it is not a picture.
 */
import React, { useEffect, useRef, useState } from 'react';

export default function ModelView({ src, label }: {
  /** The GLB, as an address the phone can read (a blob: URL). */
  readonly src: string;
  readonly label: string;
}): React.ReactElement {
  const holder = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const box = holder.current;
    if (!box) return undefined;
    let stopped = false;
    let cleanup = (): void => undefined;

    void (async () => {
      try {
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        if (stopped) return;

        const width = box.clientWidth || 320;
        const height = box.clientHeight || 320;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.setSize(width, height);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        box.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 2.2));
        const key = new THREE.DirectionalLight(0xffffff, 2.4);
        key.position.set(2, 3, 4);
        scene.add(key);
        const camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 100);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 2;
        controls.enablePan = false;
        controls.addEventListener('start', () => { controls.autoRotate = false; });

        const gltf = await new GLTFLoader().loadAsync(src);
        if (stopped) { renderer.dispose(); return; }
        const model = gltf.scene;
        /* Centred and framed, whatever size the engine made it. */
        const bounds = new THREE.Box3().setFromObject(model);
        const middle = bounds.getCenter(new THREE.Vector3());
        const reach = bounds.getSize(new THREE.Vector3()).length() || 1;
        model.position.sub(middle);
        scene.add(model);
        camera.position.set(0, reach * 0.15, reach * 1.25);
        camera.near = reach / 100;
        camera.far = reach * 10;
        camera.updateProjectionMatrix();
        controls.update();

        let frame = 0;
        const draw = (): void => {
          frame = requestAnimationFrame(draw);
          controls.update();
          renderer.render(scene, camera);
        };
        draw();
        const fit = new ResizeObserver(() => {
          const w = box.clientWidth || width;
          const h = box.clientHeight || height;
          renderer.setSize(w, h);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        });
        fit.observe(box);

        cleanup = () => {
          cancelAnimationFrame(frame);
          fit.disconnect();
          controls.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch {
        if (!stopped) setFailed(true);
      }
    })();

    return () => { stopped = true; cleanup(); };
  }, [src]);

  return (
    <div
      ref={holder}
      role="img"
      aria-label={label}
      data-modelview
      className="relative aspect-square w-full touch-none overflow-hidden rounded-2xl border border-zinc-700 bg-[radial-gradient(circle_at_50%_35%,#1f2937,#09090b)]"
    >
      {failed && <p className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-zinc-300">{label}</p>}
    </div>
  );
}
