"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface Book3DProps {
  autoRotate?: boolean;
  height?: number;
  coverUrl?: string | null;
  backCoverUrl?: string | null;
}

export function Book3D({ autoRotate = true, height = 420, coverUrl = null, backCoverUrl = null }: Book3DProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const W = el.clientWidth || 400;
    const H = height;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(33, W / H, 0.1, 100);
    camera.position.set(0, 0, 5);

    // Lights
    const key = new THREE.DirectionalLight(0xfff2e0, 3);
    key.position.set(3, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.bias = -0.0005;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xe8d4ff, 0.8);
    fill.position.set(-5, 1, -3);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0x88ccff, 0.6);
    rim.position.set(0, -2, -5);
    scene.add(rim);

    const hemi = new THREE.HemisphereLight(0xfff6e8, 0x303030, 0.5);
    scene.add(hemi);

    const pivot = new THREE.Group();
    scene.add(pivot);

    let obj: THREE.Group;

    const disposables: Array<{ dispose: () => void }> = [];
    const track = (d: { dispose: () => void }) => disposables.push(d);

    new GLTFLoader().load("/assets/models/book.glb", (g) => {
      obj = g.scene;
      obj.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      obj.scale.set(2, 2, 2);
      obj.rotation.set(THREE.MathUtils.degToRad(-90), 0, 0);
      obj.position.set(-0.812, 0.25, -0.09);

      // Bìa: mesh "Architexture_0" là khối vỏ sách. Giữ nguyên geometry/UV, chỉ
      // thay material bằng MeshStandardMaterial có map = ảnh bìa.
      const coverMesh = obj.getObjectByName("Architexture_0") as THREE.Mesh | undefined;
      if (coverMesh) {
        const geo = coverMesh.geometry;
        if (!geo.getAttribute("uv")) {
          // Lưới GLB không có UV → sinh UV dạng wrap quanh chu vi bìa:
          // front (u 0→f) → gáy spine (f→f+s) → back (f+s→1), cùng trục u
          // để 1 ảnh trải liền từ trước ra sau. Seam đặt ở mép ngoài (x=+X).
          // v chạy theo chiều cao (y).
          geo.computeBoundingBox();
          const bb = geo.boundingBox!;
          const p = geo.getAttribute("position");
          const n = geo.getAttribute("normal");
          const Wx = bb.max.x - bb.min.x;
          const H = bb.max.y - bb.min.y;
          const S = bb.max.z - bb.min.z;
          const T = 2 * Wx + S;
          const f = Wx / T;
          const s = S / T;
          const uv = new Float32Array(p.count * 2);
          const wrapU = (x: number, z: number) => {
            if (z >= bb.max.z - S * 0.25) return (f * (bb.max.x - x)) / Wx; // front
            if (z <= bb.min.z + S * 0.25) return f + s + (f * (x - bb.min.x)) / Wx; // back
            return f + (s * (bb.max.z - z)) / S; // spine
          };
          for (let i = 0; i < p.count; i++) {
            const z = p.getZ(i);
            const x = p.getX(i);
            uv[i * 2] = wrapU(x, z);
            uv[i * 2 + 1] = (p.getY(i) - bb.min.y) / H;
          }
          const uvAttr = new THREE.BufferAttribute(uv, 2);
          track(uvAttr);
          geo.setAttribute("uv", uvAttr);
        }

        const mat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 });
        track(mat);
        const mapUrl = coverUrl || backCoverUrl;
        if (mapUrl) {
          const tex = new THREE.TextureLoader().load(mapUrl);
          tex.colorSpace = THREE.SRGBColorSpace;
          track(tex);
          mat.map = tex;
        }
        coverMesh.material = mat;
      }

      pivot.add(obj);
    });

    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ opacity: 0.35 }));

    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.3;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Drag: yaw only (horizontal). Pitch is fixed tilt.
    let down = false;
    let lastX = 0;
    const yaw = { v: THREE.MathUtils.degToRad(25) };
    const TARGET = { ...yaw };

    const onDown = (e: PointerEvent) => {
      down = true;
      lastX = e.clientX;
    };
    const onMove = (e: PointerEvent) => {
      if (!down || !obj) return;
      yaw.v += (e.clientX - lastX) * 0.008;
      lastX = e.clientX;
    };
    const onUp = () => {
      down = false;
    };

    renderer.domElement.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    renderer.domElement.style.cursor = "grab";

    let id: number;
    let running = true;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Pause render khi lướt khỏi màn hình để đỡ tốn GPU.
    const io = new IntersectionObserver(([e]) => {
      running = e.isIntersecting;
      if (!running) cancelAnimationFrame(id);
      else loop();
    });
    io.observe(el);

    const loop = () => {
      id = requestAnimationFrame(loop);

      if (obj) {
        if (autoRotate && !down && !reducedMotion) {
          yaw.v = TARGET.v + Math.sin(performance.now() / 2600) * 0.22;
        } else if (!down && !autoRotate) {
          yaw.v += (TARGET.v - yaw.v) * 0.06;
        }
        pivot.rotation.y = yaw.v;
      }

      renderer.render(scene, camera);
    };
    loop();

    const onResize = () => {
      const w = el.clientWidth;
      camera.aspect = w / H;
      camera.updateProjectionMatrix();
      renderer.setSize(w, H);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(id);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [autoRotate, height, coverUrl, backCoverUrl]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}
