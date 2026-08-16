"use client";

import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Experience } from "./experience";
import { Page } from "./ui";
import { buildSheets, type BookPageImage } from "./render-book-images";

export const BookPreview = ({ showUi = true, images }: { showUi?: boolean; images?: BookPageImage[] }) => (
  <>
    {showUi && <Page total={images?.length ? buildSheets(images).length : 0} />}
    <Loader />
    <Canvas shadows camera={{ position: [-0.5, 1, 4], fov: 45 }}>
      <group position-y={0}>
        <Suspense fallback={null}>
          <Experience images={images} />
        </Suspense>
      </group>
    </Canvas>
  </>
);
