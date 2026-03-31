import { useEffect, useMemo, useRef, useState } from 'react';
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
    case 'high': return '#C8243C';
    case 'medium': return '#D97B00';
    case 'low': return '#2E7D4F';
    default: return '#C8243C';
  }
}

const COUNTRY_NAME_MAP: Record<string, string> = {
  Ukrajna: 'Ukraine',
  Szudán: 'Sudan',
  Mianmar: 'Myanmar',
  Haiti: 'Haiti',
  Kongó: 'Democratic Republic of the Congo',
  Palesztina: 'Palestine',
  Szíria: 'Syria',
  Irán: 'Iran',
};

interface GeoJsonFeature {
  properties?: {
    name?: string;
    admin?: string;
    sovereignt?: string;
    sovereignt?: string;
    geounit?: string;
  };
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
}

interface GeoJsonCollection {
  features?: GeoJsonFeature[];
}

function SpaceBackdrop() {
  const starCount = 2600;
  const starPositions = useMemo(() => {
    const positions = new Float32Array(starCount * 3);

    for (let index = 0; index < starCount; index += 1) {
      const radius = 9.5 + Math.random() * 14;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[index * 3 + 2] = radius * Math.cos(phi);
    }

    return positions;
  }, []);

  return (
    <group>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={starCount}
            array={starPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial color="#f7f2e8" size={0.058} transparent opacity={0.88} sizeAttenuation />
      </points>
      <Sphere args={[7.2, 64, 64]}>
        <meshBasicMaterial color="#130f12" transparent opacity={0.34} side={THREE.BackSide} />
      </Sphere>
      <Sphere args={[11.5, 48, 48]}>
        <meshBasicMaterial color="#0b0b0b" side={THREE.BackSide} />
      </Sphere>
    </group>
  );
}

function mapCountryName(country: string): string {
  return COUNTRY_NAME_MAP[country] || country;
}

function geometryToLinePoints(coordinates: unknown, radius: number): THREE.Vector3[][] {
  if (!Array.isArray(coordinates)) return [];

  return coordinates.flatMap((polygon) => {
    if (!Array.isArray(polygon)) return [];

    const rings = Array.isArray((polygon as unknown[])[0]?.[0])
      ? polygon as number[][][]
      : [polygon as number[][]];

    return rings
      .map((ring) =>
        ring
          .filter((point) => Array.isArray(point) && point.length >= 2)
          .map((point) => latLonToVector3(point[1], point[0], radius))
      )
      .filter((ring) => ring.length > 2);
  });
}

function CountryHighlight({ country, color }: { country: string | null; color: string }) {
  const [geoJson, setGeoJson] = useState<GeoJsonCollection | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then((response) => response.json())
      .then((data: GeoJsonCollection) => {
        if (!cancelled) setGeoJson(data);
      })
      .catch(() => {
        if (!cancelled) setGeoJson(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const outlineRings = useMemo(() => {
    if (!geoJson || !country) return [];

    const target = mapCountryName(country).toLowerCase();
    const feature = geoJson.features?.find((item) => {
      const names = [
        item.properties?.name,
        item.properties?.admin,
        item.properties?.sovereignt,
        item.properties?.sovereignt,
        item.properties?.geounit,
      ]
        .filter(Boolean)
        .map((name) => String(name).toLowerCase());

      return names.includes(target);
    });

    if (!feature?.geometry?.coordinates) return [];

    return geometryToLinePoints(feature.geometry.coordinates, 2.045);
  }, [geoJson, country]);

  if (!country || outlineRings.length === 0) return null;

  return (
    <group>
      {outlineRings.map((ring, index) => (
        <lineLoop key={`${country}-${index}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={ring.length}
              array={new Float32Array(ring.flatMap((point) => [point.x, point.y, point.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={color} linewidth={2} transparent opacity={0.95} />
        </lineLoop>
      ))}
    </group>
  );
}

function EarthMesh() {
  const texture = useLoader(THREE.TextureLoader, 'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg');

  return (
    <Sphere args={[2, 64, 64]}>
      <meshStandardMaterial map={texture} color="#f1ece1" emissive="#1f1f1f" emissiveIntensity={0.22} roughness={0.88} metalness={0.01} />
    </Sphere>
  );
}

function AtmosphereGlow() {
  return (
    <Sphere args={[2.08, 64, 64]}>
      <meshBasicMaterial color="#f5f1e8" transparent opacity={0.07} side={THREE.BackSide} />
    </Sphere>
  );
}

interface ConflictMarkerProps {
  conflict: Conflict;
  onSelect: (c: Conflict) => void;
  onHoverCountry: (country: string | null, severity: string) => void;
}

function ConflictMarker({ conflict, onSelect, onHoverCountry }: ConflictMarkerProps) {
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
      const pulse = 1 + Math.sin(Date.now() * 0.0018) * 0.18;
      ringRef.current.scale.setScalar(pulse);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.22 - Math.sin(Date.now() * 0.0018) * 0.06;
    }
    if (beamRef.current) {
      const glow = 0.08 + Math.sin(Date.now() * 0.0016 + 1) * 0.03;
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
      onPointerOver={() => {
        setHovered(true);
        onHoverCountry(conflict.country, conflict.severity);
        gl.domElement.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        onHoverCountry(null, conflict.severity);
        gl.domElement.style.cursor = 'auto';
      }}
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
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredSeverity, setHoveredSeverity] = useState<string>('low');

  return (
    <>
      <color attach="background" args={['#111111']} />
      <ambientLight intensity={1.42} />
      <hemisphereLight
        skyColor="#f4efe6"
        groundColor="#5a5148"
        intensity={1.22}
      />
      <directionalLight position={[5, 4, 5]} intensity={1.5} color="#fff8ee" />
      <pointLight position={[-6, -3, -4]} intensity={1.02} color="#f0e8d8" />
      <pointLight position={[0, 0, -6]} intensity={0.72} color="#e9e0cf" />
      <pointLight position={[0, 5, -3]} intensity={0.5} color="#ffffff" />

      <group>
        <SpaceBackdrop />
        <EarthMesh />
        <AtmosphereGlow />
        <CountryHighlight country={hoveredCountry} color={severityColor(hoveredSeverity)} />
        {spreadConflicts.map((c) => (
          <ConflictMarker
            key={c.event_id}
            conflict={c}
            onSelect={onSelectConflict}
            onHoverCountry={(country, severity) => {
              setHoveredCountry(country);
              setHoveredSeverity(severity);
            }}
          />
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
