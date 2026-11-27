'use client';

// 3D xarita (demo). 2D xaritadagi ma'lumotlardan foydalanadi: zonalar va uskunalar koordinatalari bir xil.
// Faqat brauzerda yuklanadi (next/dynamic, ssr: false).
import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, RoundedBox } from '@react-three/drei';
import type { Mesh } from 'three';
import { STATUS_COLORS, ZONE_COLORS } from '@/lib/tokens';
import type { Zone } from '@/schemas/organization';
import type { EquipmentStatusName } from '@/lib/labels';

/** 20 px (2D xarita birligi) = 1 sahna birligi */
const SCALE = 20;

export interface Equipment3D {
  id: string;
  name: string;
  code: string;
  status: EquipmentStatusName;
  nominalPowerKw: number;
  mapX: number;
  mapY: number;
}

interface Props {
  layout: { width: number; height: number; zones: Zone[] };
  equipment: Equipment3D[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function StatusLamp({ status, animate }: { status: EquipmentStatusName; animate: boolean }) {
  const ref = useRef<Mesh>(null);
  const alerting = status === 'WARNING' || status === 'OFFLINE';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = animate && alerting ? 1 + Math.sin(clock.elapsedTime * 4) * 0.18 : 1;
    ref.current.scale.setScalar(s);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.36, 24, 16]} />
      <meshStandardMaterial color={STATUS_COLORS[status]} emissive={STATUS_COLORS[status]} emissiveIntensity={0.9} />
    </mesh>
  );
}

function Machine({
  eq,
  position,
  selected,
  onSelect,
  animate,
}: {
  eq: Equipment3D;
  position: [number, number, number];
  selected: boolean;
  onSelect: (id: string) => void;
  animate: boolean;
}) {
  const [hover, setHover] = useState(false);
  // O'lcham nominal quvvatga qarab (kattaroq uskuna — kattaroq blok)
  const size = Math.min(3.2, 1.7 + Math.sqrt(Math.max(eq.nominalPowerKw, 1)) / 5);
  const w = size * 1.35;
  const h = size;
  const d = size;
  const lift = hover || selected ? 0.15 : 0;
  const color = STATUS_COLORS[eq.status];

  return (
    <group position={position}>
      {/* poldagi holat halqasi */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.07}>
        <ringGeometry args={[size * 0.95, size * (selected ? 1.25 : 1.1), 40]} />
        <meshBasicMaterial color={selected ? '#1677F2' : color} transparent opacity={selected ? 0.9 : 0.55} />
      </mesh>
      <group
        position-y={lift}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(eq.id);
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = '';
        }}
      >
        {/* korpus */}
        <RoundedBox args={[w, h, d]} radius={0.14} smoothness={3} position-y={h / 2 + 0.05} castShadow receiveShadow>
          <meshStandardMaterial color={selected ? '#EAF2FE' : '#FFFFFF'} roughness={0.55} />
        </RoundedBox>
        {/* boshqaruv ekrani */}
        <mesh position={[-w * 0.15, h * 0.62 + 0.05, d / 2 + 0.01]}>
          <planeGeometry args={[w * 0.45, h * 0.32]} />
          <meshStandardMaterial color="#102B5C" emissive="#0b2a5a" emissiveIntensity={0.4} />
        </mesh>
        {/* ekrandagi grafik chizig'i */}
        <mesh position={[-w * 0.15, h * 0.6 + 0.05, d / 2 + 0.02]}>
          <planeGeometry args={[w * 0.36, 0.05]} />
          <meshBasicMaterial color="#5BE0A6" />
        </mesh>
        {/* tepa panel */}
        <mesh position-y={h + 0.08} castShadow>
          <boxGeometry args={[w * 0.6, 0.12, d * 0.6]} />
          <meshStandardMaterial color="#1677F2" />
        </mesh>
        {/* holat chirog'i */}
        <group position-y={h + 0.55}>
          <StatusLamp status={eq.status} animate={animate} />
        </group>
        <Html position={[0, h + 1.35, 0]} center distanceFactor={22} style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
          <div
            style={{
              background: selected ? '#1677F2' : 'rgba(255,255,255,0.92)',
              color: selected ? '#fff' : '#102B5C',
              border: '1px solid #DFE7F2',
              borderRadius: 8,
              padding: '2px 8px',
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
          >
            {eq.code}
          </div>
        </Html>
      </group>
    </group>
  );
}

function Scene({ layout, equipment, selected, onSelect, animate }: Props & { animate: boolean }) {
  const W = layout.width / SCALE;
  const H = layout.height / SCALE;
  const toWorld = (x: number, y: number): [number, number, number] => [x / SCALE - W / 2, 0, y / SCALE - H / 2];
  const wallH = 1.4;
  const wallT = 0.25;

  return (
    <>
      <color attach="background" args={['#F3F8FF']} />
      <hemisphereLight args={['#ffffff', '#dfe8f5', 1.1]} />
      <ambientLight intensity={0.75} />
      <directionalLight
        position={[W * 0.4, 30, H * 0.8]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-W}
        shadow-camera-right={W}
        shadow-camera-top={H}
        shadow-camera-bottom={-H}
      />

      {/* pol */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow onClick={() => onSelect(null)}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <gridHelper args={[Math.max(W, H), Math.round(Math.max(W, H) / 2), '#E3EBF6', '#EEF3FA']} position-y={0.005} />

      {/* devorlar (yarim shaffof) */}
      {[
        { p: [0, wallH / 2, -H / 2] as const, s: [W, wallH, wallT] as const },
        { p: [0, wallH / 2, H / 2] as const, s: [W, wallH, wallT] as const },
        { p: [-W / 2, wallH / 2, 0] as const, s: [wallT, wallH, H] as const },
        { p: [W / 2, wallH / 2, 0] as const, s: [wallT, wallH, H] as const },
      ].map((wall, i) => (
        <mesh key={i} position={[...wall.p]} castShadow receiveShadow>
          <boxGeometry args={[...wall.s]} />
          <meshStandardMaterial color="#C9D7EA" transparent opacity={0.55} />
        </mesh>
      ))}

      {/* zonalar */}
      {layout.zones.map((z) => {
        const c = ZONE_COLORS[z.color];
        const [x, , zz] = toWorld(z.x + z.width / 2, z.y + z.height / 2);
        const w = z.width / SCALE;
        const d = z.height / SCALE;
        return (
          <group key={z.id} position={[x, 0, zz]}>
            <mesh position-y={0.02} receiveShadow onClick={() => onSelect(null)}>
              <boxGeometry args={[w, 0.04, d]} />
              <meshStandardMaterial color={c.stroke} />
            </mesh>
            <mesh position-y={0.045} receiveShadow onClick={() => onSelect(null)}>
              <boxGeometry args={[w - 0.25, 0.02, d - 0.25]} />
              <meshStandardMaterial color={c.fill} />
            </mesh>
            <Html position={[-w / 2 + 0.4, 0.1, -d / 2 + 0.6]} distanceFactor={26} style={{ pointerEvents: 'none' }} zIndexRange={[10, 0]}>
              <div style={{ color: '#52627A', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{z.name}</div>
            </Html>
          </group>
        );
      })}

      {equipment.map((e) => (
        <Machine key={e.id} eq={e} position={toWorld(e.mapX, e.mapY)} selected={e.id === selected} onSelect={onSelect} animate={animate} />
      ))}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={Math.max(W, H) * 2}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 0]}
      />
    </>
  );
}

export function Factory3D(props: Props) {
  const [webgl] = useState(hasWebGL);
  const animate = useMemo(() => !prefersReducedMotion(), []);
  const W = props.layout.width / SCALE;
  const H = props.layout.height / SCALE;
  // Kamera: butun zavod ko'rinadigan masofa (~50° burchak ostida). Tor ekranda uzoqroq.
  const cam = useMemo(() => {
    const narrow = typeof window !== 'undefined' && window.innerWidth < 768;
    const dist = Math.max(W, H) * (narrow ? 1.5 : 1.02);
    return { y: dist * 0.77, z: dist * 0.64 };
  }, [W, H]);

  if (!webgl) {
    return (
      <div className="flex h-[420px] items-center justify-center p-6 text-center text-sm text-muted">
        Brauzeringiz 3D grafikani (WebGL) qo‘llab-quvvatlamaydi. 2D xaritadan foydalaning.
      </div>
    );
  }
  return (
    <div className="h-[420px] w-full sm:h-[520px]" role="img" aria-label="Zavodning 3D xaritasi (demo). Uskunani tanlash uchun yon tomondagi ro‘yxatdan ham foydalanish mumkin.">
      <Canvas
        shadows
        dpr={[1, 2]}
        frameloop={animate ? 'always' : 'demand'}
        camera={{ position: [0, cam.y, cam.z], fov: 40, near: 0.1, far: 500 }}
        onPointerMissed={() => props.onSelect(null)}
      >
        <Scene {...props} animate={animate} />
      </Canvas>
    </div>
  );
}
