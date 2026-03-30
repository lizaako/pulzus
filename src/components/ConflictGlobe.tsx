import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { Conflict } from '@/lib/supabase';

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Offset overlapping conflicts so they fan out around the same location
function offsetConflicts(conflicts: Conflict[]): (Conflict & { _offsetLat: number; _offsetLon: number })[] {
  const groups: Record<string, Conflict[]> = {};
  for (const c of conflicts) {
    const key = `${c.latitude.toFixed(1)}_${c.longitude.toFixed(1)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  }
  const result: (Conflict & { _offsetLat: number; _offsetLon: number })[] = [];
  for (const group of Object.values(groups)) {
    if (group.length === 1) {
      result.push({ ...group[0], _offsetLat: group[0].latitude, _offsetLon: group[0].longitude });
    } else {
      group.forEach((c, i) => {
        const angle = (i / group.length) * Math.PI * 2;
        const spread = 1.5; // degrees
        result.push({
          ...c,
          _offsetLat: c.latitude + Math.cos(angle) * spread,
          _offsetLon: c.longitude + Math.sin(angle) * spread,
        });
      });
    }
  }
  return result;
}

function severityColor(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'high': return '#ff3333';
    case 'medium': return '#ff8800';
    case 'low': return '#33cc33';
    default: return '#00d4ff';
  }
}

function EarthMesh() {
  const texture = useLoader(THREE.TextureLoader, 'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg');

  return (
    <Sphere args={[2, 64, 64]}>
      <meshStandardMaterial map={texture} />
    </Sphere>
  );
}

function AtmosphereGlow() {
  return (
    <Sphere args={[2.08, 64, 64]}>
      <meshBasicMaterial color="#4499ff" transparent opacity={0.08} side={THREE.BackSide} />
    </Sphere>
  );
}

interface ConflictMarkerProps {
  conflict: Conflict;
  onSelect: (c: Conflict) => void;
}

function ConflictMarker({ conflict, onSelect }: ConflictMarkerProps) {
  const pos = useMemo(
    () => latLonToVector3(conflict.latitude, conflict.longitude, 2.05),
    [conflict.latitude, conflict.longitude]
  );
  const color = severityColor(conflict.severity);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<THREE.Mesh>(null);
  const { gl } = useThree();

  useFrame((_, delta) => {
    if (ref.current) {
      const scale = 1 + Math.sin(Date.now() * 0.003) * 0.3;
      ref.current.scale.setScalar(hovered ? 1.8 : scale);
    }
  });

  return (
    <mesh
      ref={ref}
      position={pos}
      onClick={(e) => { e.stopPropagation(); onSelect(conflict); }}
      onPointerOver={() => { setHovered(true); gl.domElement.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); gl.domElement.style.cursor = 'auto'; }}
    >
      <sphereGeometry args={[0.04, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} />
    </mesh>
  );
}

interface GlobeSceneProps {
  conflicts: Conflict[];
  onSelectConflict: (c: Conflict) => void;
}

function GlobeScene({ conflicts, onSelectConflict }: GlobeSceneProps) {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-5, -3, -5]} intensity={0.5} color="#aaccff" />

      <group>
        <EarthMesh />
        <AtmosphereGlow />
        {conflicts.map((c) => (
          <ConflictMarker key={c.event_id} conflict={c} onSelect={onSelectConflict} />
        ))}
      </group>

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        enableRotate={true}
        minDistance={3}
        maxDistance={8}
        autoRotate={false}
      />
    </>
  );
}

interface ConflictGlobeProps {
  conflicts: Conflict[];
  onSelectConflict: (c: Conflict) => void;
}

export default function ConflictGlobe({ conflicts, onSelectConflict }: ConflictGlobeProps) {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <GlobeScene conflicts={conflicts} onSelectConflict={onSelectConflict} />
      </Canvas>
    </div>
  );
}
