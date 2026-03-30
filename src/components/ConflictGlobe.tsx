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
  const lat = (conflict as any)._offsetLat ?? conflict.latitude;
  const lon = (conflict as any)._offsetLon ?? conflict.longitude;
  const pos = useMemo(() => latLonToVector3(lat, lon, 2.03), [lat, lon]);
  const color = useMemo(() => new THREE.Color(severityColor(conflict.severity)), [conflict.severity]);
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();

  // Pulse animation
  useFrame(() => {
    if (ringRef.current) {
      const pulse = 1 + Math.sin(Date.now() * 0.004) * 0.4;
      ringRef.current.scale.setScalar(pulse);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.35 - Math.sin(Date.now() * 0.004) * 0.15;
    }
    if (beamRef.current) {
      const glow = 0.15 + Math.sin(Date.now() * 0.003 + 1) * 0.1;
      (beamRef.current.material as THREE.MeshBasicMaterial).opacity = glow;
    }
  });

  // Orient the marker to face outward from globe center
  const normal = useMemo(() => pos.clone().normalize(), [pos]);
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return q;
  }, [normal]);

  return (
    <group
      ref={groupRef}
      position={pos}
      quaternion={quaternion}
      onClick={(e) => { e.stopPropagation(); onSelect(conflict); }}
      onPointerOver={() => { setHovered(true); gl.domElement.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); gl.domElement.style.cursor = 'auto'; }}
    >
      {/* Core dot */}
      <mesh scale={hovered ? 1.6 : 1}>
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Inner glow */}
      <mesh scale={hovered ? 2.2 : 1.5}>
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>

      {/* Pulsing ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.025, 0.035, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Vertical beam / spike */}
      <mesh ref={beamRef} position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.002, 0.0005, 0.06, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

interface GlobeSceneProps {
  conflicts: Conflict[];
  onSelectConflict: (c: Conflict) => void;
}

function GlobeScene({ conflicts, onSelectConflict }: GlobeSceneProps) {
  const spreadConflicts = useMemo(() => offsetConflicts(conflicts), [conflicts]);
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-5, -3, -5]} intensity={0.5} color="#aaccff" />

      <group>
        <EarthMesh />
        <AtmosphereGlow />
        {spreadConflicts.map((c) => (
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
