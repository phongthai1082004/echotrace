"use client";

import { Environment, OrbitControls, useCursor, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useSpring } from "@react-spring/three";
import { useAtom } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bone,
  BoxGeometry,
  Color,
  type Group,
  Float32BufferAttribute,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  SRGBColorSpace,
  Uint16BufferAttribute,
  Vector3,
} from "three";
import { pageAtom, pages, turnPage } from "./ui";
import { buildSheets, type BookPageImage } from "./render-book-images";

const TEX_ROOT = "/book-slider/textures";

const PAGE_WIDTH = 1.38;
const PAGE_HEIGHT = 1.71;
const PAGE_DEPTH = 0.003;
const PAGE_SEGMENTS = 30;
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;

const pageGeometry = new BoxGeometry(PAGE_WIDTH, PAGE_HEIGHT, PAGE_DEPTH, PAGE_SEGMENTS, 2);
pageGeometry.translate(PAGE_WIDTH / 2, 0, 0);

const position = pageGeometry.attributes.position;
const vertex = new Vector3();
const skinIndexes: number[] = [];
const skinWeights: number[] = [];

for (let i = 0; i < position.count; i++) {
  vertex.fromBufferAttribute(position, i);
  const x = vertex.x;
  const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH));
  const skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH;
  skinIndexes.push(skinIndex, skinIndex + 1, 0, 0);
  skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
}

pageGeometry.setAttribute("skinIndex", new Uint16BufferAttribute(skinIndexes, 4));
pageGeometry.setAttribute("skinWeight", new Float32BufferAttribute(skinWeights, 4));

const whiteColor = new Color("white");
const emissiveColor = new Color("orange");

const pageMaterials = [
  new MeshStandardMaterial({ color: whiteColor }),
  new MeshStandardMaterial({ color: "#111" }),
  new MeshStandardMaterial({ color: whiteColor }),
  new MeshStandardMaterial({ color: whiteColor }),
];

pages.forEach((page) => {
  useTexture.preload(`${TEX_ROOT}/${page.front}.jpg`);
  useTexture.preload(`${TEX_ROOT}/${page.back}.jpg`);
});

type PageProps = {
  number: number;
  front: string;
  back: string;
  page: number;
  opened: boolean;
  bookClosed: boolean;
};

const Page = ({ number, front, back, page, opened, bookClosed }: PageProps) => {
  const [picture, picture2] = useTexture([front, back]);
  // eslint-disable-next-line react-hooks/immutability -- texture color space must be set after load
  picture.colorSpace = picture2.colorSpace = SRGBColorSpace;

  const [, setPage] = useAtom(pageAtom);
  const group = useRef<Group>(null);
  const skinnedMeshRef = useRef<SkinnedMesh>(null);
  const [highlighted, setHighlighted] = useState(false);
  useCursor(highlighted);

  // Angle lật: đóng = +90°, mở = -90°. react-spring driver.
  const { angle } = useSpring({
    angle: opened ? -Math.PI / 2 : Math.PI / 2,
    config: { mass: 1, tension: 200, friction: 30 },
  });

  const manualSkinnedMesh = useMemo(() => {
    const bones: Bone[] = [];
    for (let i = 0; i <= PAGE_SEGMENTS; i++) {
      const bone = new Bone();
      bones.push(bone);
      if (i === 0) {
        bone.position.x = 0;
      } else {
        bone.position.x = SEGMENT_WIDTH;
      }
      if (i > 0) bones[i - 1].add(bone);
    }
    const skeleton = new Skeleton(bones);

    const materials: MeshStandardMaterial[] = [
      ...pageMaterials,
      new MeshStandardMaterial({
        color: whiteColor,
        map: picture,
        roughness: 0.1,
        emissive: emissiveColor,
        emissiveIntensity: 0,
      }),
      new MeshStandardMaterial({
        color: whiteColor,
        map: picture2,
        roughness: 0.1,
        emissive: emissiveColor,
        emissiveIntensity: 0,
      }),
    ];

    const mesh = new SkinnedMesh(pageGeometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.add(skeleton.bones[0]);
    mesh.bind(skeleton);
    return mesh;
  }, [picture, picture2, number]);

  useFrame(() => {
    if (!skinnedMeshRef.current) return;

    const materials = skinnedMeshRef.current.material as MeshStandardMaterial[];
    materials[4].emissiveIntensity = materials[5].emissiveIntensity = highlighted ? 0.22 : 0;

    const targetRotation = angle.get() + (bookClosed ? 0 : MathUtilsDeg(number * 0.8));
    const bones = skinnedMeshRef.current.skeleton.bones;
    for (let i = 0; i < bones.length; i++) {
      const target = i === 0 ? group.current : bones[i];
      if (!target) return;

      const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
      const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
      let rotationAngle =
        0.18 * insideCurveIntensity * targetRotation -
        0.05 * outsideCurveIntensity * targetRotation;
      if (bookClosed) rotationAngle = i === 0 ? targetRotation : 0;
      target.rotation.y = rotationAngle;
      target.rotation.x = 0;
    }
  });

  return (
    <group
      ref={group}
      onPointerEnter={(e) => { e.stopPropagation(); setHighlighted(true); }}
      onPointerLeave={(e) => { e.stopPropagation(); setHighlighted(false); }}
      onClick={(e) => {
        e.stopPropagation();
        turnPage(opened ? number : number + 1);
        setHighlighted(false);
      }}
    >
      <primitive
        object={manualSkinnedMesh}
        ref={skinnedMeshRef}
        position-z={-number * PAGE_DEPTH + page * PAGE_DEPTH}
      />
    </group>
  );
};

function MathUtilsDeg(n: number) {
  return (n * Math.PI) / 180;
}

export const Book = (props: React.ComponentProps<"group"> & { sheets?: { front: string; back: string }[] }) => {
  const [page] = useAtom(pageAtom);
  const [delayedPage, setDelayedPage] = useState(page);
  const sheets = props.sheets ?? pages.map((p) => ({ front: `${TEX_ROOT}/${p.front}.jpg`, back: `${TEX_ROOT}/${p.back}.jpg` }));

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const goToPage = () => {
      setDelayedPage((delayedPage) => {
        if (page === delayedPage) return delayedPage;
        timeout = setTimeout(
          () => { goToPage(); },
          Math.abs(page - delayedPage) > 2 ? 50 : 150
        );
        return page > delayedPage ? delayedPage + 1 : delayedPage - 1;
      });
    };
    goToPage();
    return () => clearTimeout(timeout);
  }, [page]);

  return (
    <group {...props} rotation-y={-Math.PI / 2}>
      {sheets.map((sheet, index) => (
        <Page
          key={index}
          page={delayedPage}
          number={index}
          opened={delayedPage > index}
          bookClosed={delayedPage === 0 || delayedPage === sheets.length}
          front={sheet.front}
          back={sheet.back}
        />
      ))}
    </group>
  );
};

export function Experience({ images }: { images?: BookPageImage[] }) {
  const sheets = images?.length ? buildSheets(images) : undefined;
  const aspect = images?.[0] ? images[0].width / images[0].height : PAGE_WIDTH / PAGE_HEIGHT;
  const scale = (aspect / (PAGE_WIDTH / PAGE_HEIGHT));

  return (
    <>
      <OrbitControls enableDamping />
      <Environment preset="studio" />
      <directionalLight
        position={[2, 5, 2]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      <group rotation-x={-Math.PI / 4} rotation-z={-0.1} position-y={0.4}>
        <Book sheets={sheets} scale-x={scale} />
      </group>
      <mesh position-y={-1.5} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <shadowMaterial transparent opacity={0.2} />
      </mesh>
    </>
  );
}
