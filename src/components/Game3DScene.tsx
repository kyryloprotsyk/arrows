import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, Environment, OrthographicCamera, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { Buddy3DBlock } from './Buddy3DBlock';

// --- Camera Controller to smoothly orbit rotation ---
const CameraController: React.FC = () => {
  const { rotState, buddies } = useGameStore();
  const { camera } = useThree();
  
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startAngle = useRef(rotState * (Math.PI / 2));
  const currentAngle = useRef(rotState * (Math.PI / 2));
  const targetAngle = useRef(rotState * (Math.PI / 2));

  const [distance, setDistance] = useState(8.5);

  useEffect(() => {
    if (!isDragging.current) {
      targetAngle.current = rotState * (Math.PI / 2);
    }
  }, [rotState]);

  useEffect(() => {
    const handleDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.canvas3d-container') || target.closest('.bottom-utility-dock') || target.closest('.hud-top-floating-bar')) return;
      
      isDragging.current = true;
      startX.current = e.clientX;
      startAngle.current = currentAngle.current;
    };
    
    const handleMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - startX.current;
      const angleOffset = (deltaX / window.innerWidth) * Math.PI * 1.6;
      targetAngle.current = startAngle.current - angleOffset;
    };
    
    const handleUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      
      const currentVal = targetAngle.current;
      const snappedRotState = Math.round(currentVal / (Math.PI / 2));
      const wrappedState = ((snappedRotState % 4) + 4) % 4;
      
      useGameStore.setState({ rotState: wrappedState });
      targetAngle.current = snappedRotState * (Math.PI / 2);
    };

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.canvas3d-container')) return;
      setDistance(d => Math.max(5.5, Math.min(14.0, d + e.deltaY * 0.005)));
    };
    
    window.addEventListener('pointerdown', handleDown);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('wheel', handleWheel);
    
    return () => {
      window.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const targetLookAt = new THREE.Vector3(0, 0, 0);

  useEffect(() => {
    if (buddies.length > 0) {
      let sx = 0, sy = 0, sz = 0;
      buddies.forEach(b => { sx += b.x; sy += b.y; sz += b.z; });
      targetLookAt.set(sx / buddies.length, (sy / buddies.length) * 0.5, sz / buddies.length);
    }
  }, [buddies]);

  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    const angleDiff = targetAngle.current - currentAngle.current;
    const shortestDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
    currentAngle.current += shortestDiff * Math.min(1.0, delta * 10.0);

    currentLookAt.current.lerp(targetLookAt, delta * 5);

    const height = distance * 0.72;
    const x = Math.cos(currentAngle.current) * distance;
    const z = Math.sin(currentAngle.current) * distance;

    camera.position.set(x + currentLookAt.current.x, height + currentLookAt.current.y, z + currentLookAt.current.z);
    camera.lookAt(currentLookAt.current);
    camera.updateProjectionMatrix();
  });

  return null;
};

// --- Ambient Weather Particles ---
interface Particle {
  pos: THREE.Vector3;
  speed: number;
  wobbleSpeed: number;
  wobbleRange: number;
  seed: number;
}

const WeatherParticles: React.FC = () => {
  const { selectedWorld } = useGameStore();
  const pointsRef = useRef<THREE.Points>(null);
  
  const count = 60;
  const [particles] = useState<Particle[]>(() => {
    const list: Particle[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          Math.random() * 8 - 1,
          (Math.random() - 0.5) * 12
        ),
        speed: 0.8 + Math.random() * 1.2,
        wobbleSpeed: 1 + Math.random() * 2,
        wobbleRange: 0.1 + Math.random() * 0.3,
        seed: Math.random() * 100
      });
    }
    return list;
  });

  const geomRef = useRef<THREE.BufferGeometry>(null);

  useFrame((state, delta) => {
    if (!geomRef.current) return;
    const positions = geomRef.current.attributes.position.array as Float32Array;
    const time = state.clock.getElapsedTime();

    particles.forEach((p, idx) => {
      if (selectedWorld === 1 || selectedWorld === 6) {
        p.pos.y += p.speed * delta * 0.8;
        if (p.pos.y > 6) {
          p.pos.y = -2;
          p.pos.x = (Math.random() - 0.5) * 12;
          p.pos.z = (Math.random() - 0.5) * 12;
        }
      } else {
        p.pos.y -= p.speed * delta * 0.9;
        if (p.pos.y < -2) {
          p.pos.y = 6;
          p.pos.x = (Math.random() - 0.5) * 12;
          p.pos.z = (Math.random() - 0.5) * 12;
        }
      }

      const wobble = Math.sin(time * p.wobbleSpeed + p.seed) * p.wobbleRange * delta;
      p.pos.x += wobble;
      p.pos.z += Math.cos(time * p.wobbleSpeed + p.seed) * p.wobbleRange * delta;

      positions[idx * 3] = p.pos.x;
      positions[idx * 3 + 1] = p.pos.y;
      positions[idx * 3 + 2] = p.pos.z;
    });

    geomRef.current.attributes.position.needsUpdate = true;
  });

  const getParticleColor = () => {
    switch (selectedWorld) {
      case 1: return '#ffb6d4'; // Jelly: Pinkish bubbles
      case 2: return '#2d8b24'; // Dino: Green forest leaves
      case 3: return '#00f0ff'; // Cosmo: Cyber pixels
      case 4: return '#4fa5ff'; // Coral: Blue rain
      case 5: return '#ffffff'; // Ice: White snow
      case 6: return '#ff3b3b'; // Volcanic: Red sparks
      default: return '#ffffff';
    }
  };

  const pointsArray = new Float32Array(count * 3);
  particles.forEach((p, i) => {
    pointsArray[i * 3] = p.pos.x;
    pointsArray[i * 3 + 1] = p.pos.y;
    pointsArray[i * 3 + 2] = p.pos.z;
  });

  const pSize = selectedWorld === 3 ? 0.08 : selectedWorld === 4 ? 0.05 : 0.12;

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[pointsArray, 3]}
          count={count}
          array={pointsArray}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={getParticleColor()}
        size={pSize}
        transparent
        opacity={0.7}
        sizeAttenuation
      />
    </points>
  );
};

// --- Stylized Environment Vignette Props ---
const EnvironmentProps: React.FC = () => {
  const { selectedWorld, levelGridCoords } = useGameStore();
  const isCustomLevel = selectedWorld === 3 && levelGridCoords.length === 64;

  const propGroupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!propGroupRef.current) return;
    const time = state.clock.getElapsedTime();
    
    propGroupRef.current.children.forEach((child, i) => {
      child.position.y = child.userData.baseY + Math.sin(time * 0.8 + i) * 0.08;
      child.rotation.y += 0.005;
    });
  });

  const getProps = () => {
    const list: Array<{
      key: string;
      position: [number, number, number];
      type: 'tree' | 'crystal' | 'jellyCloud';
      color: string;
    }> = [];

    if (selectedWorld === 2) {
      list.push(
        { key: 't1', position: [-2.5, -0.3, 2.5], type: 'tree', color: '#16a34a' },
        { key: 't2', position: [4.0, -0.3, -2.5], type: 'tree', color: '#15803d' },
        { key: 't3', position: [9.5, -0.3, 4.5], type: 'tree', color: '#22c55e' },
        { key: 't4', position: [2.5, -0.3, 9.5], type: 'tree', color: '#16a34a' }
      );
    } else if (selectedWorld === 3 || isCustomLevel) {
      list.push(
        { key: 'c1', position: [-2.5, 0.4, 2.5], type: 'crystal', color: '#06b6d4' },
        { key: 'c2', position: [5.0, 0.8, -2.0], type: 'crystal', color: '#d946ef' },
        { key: 'c3', position: [9.5, 0.6, 5.0], type: 'crystal', color: '#06b6d4' },
        { key: 'c4', position: [2.0, 1.2, 9.5], type: 'crystal', color: '#a855f7' }
      );
    } else {
      list.push(
        { key: 'j1', position: [-2.5, 0.6, 3.0], type: 'jellyCloud', color: '#ffb6d4' },
        { key: 'j2', position: [4.5, 0.8, -2.5], type: 'jellyCloud', color: '#a78bfa' },
        { key: 'j3', position: [9.0, 0.4, 6.0], type: 'jellyCloud', color: '#f472b6' },
        { key: 'j4', position: [1.5, 0.8, 9.0], type: 'jellyCloud', color: '#818cf8' }
      );
    }
    return list;
  };

  const items = getProps();

  return (
    <group ref={propGroupRef}>
      {items.map((item) => (
        <group key={item.key} position={item.position} userData={{ baseY: item.position[1] }}>
          {item.type === 'tree' && (
            <group>
              <mesh position={[0, 0.25, 0]} castShadow>
                <cylinderGeometry args={[0.04, 0.07, 0.5, 8]} />
                <meshStandardMaterial color="#78350f" roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.6, 0]} castShadow>
                <coneGeometry args={[0.22, 0.45, 8]} />
                <meshStandardMaterial color={item.color} roughness={0.85} />
              </mesh>
            </group>
          )}

          {item.type === 'crystal' && (
            <mesh castShadow receiveShadow>
              <octahedronGeometry args={[0.22]} />
              <meshPhysicalMaterial
                color={item.color}
                emissive={item.color}
                emissiveIntensity={0.6}
                roughness={0.1}
                clearcoat={1.0}
                transmission={0.3}
              />
            </mesh>
          )}

          {item.type === 'jellyCloud' && (
            <group>
              <mesh castShadow>
                <sphereGeometry args={[0.18, 12, 10]} />
                <meshPhysicalMaterial color={item.color} roughness={0.2} transmission={0.2} emissive={item.color} emissiveIntensity={0.15} />
              </mesh>
              <mesh position={[0.14, -0.05, 0.05]} castShadow>
                <sphereGeometry args={[0.13, 10, 8]} />
                <meshPhysicalMaterial color={item.color} roughness={0.2} transmission={0.2} emissive={item.color} emissiveIntensity={0.15} />
              </mesh>
              <mesh position={[-0.14, -0.05, -0.05]} castShadow>
                <sphereGeometry args={[0.13, 10, 8]} />
                <meshPhysicalMaterial color={item.color} roughness={0.2} transmission={0.2} emissive={item.color} emissiveIntensity={0.15} />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </group>
  );
};

// --- Main 3D Scene viewport ---
export const Game3DScene: React.FC = () => {
  const { selectedWorld, levelGridCoords, buddies, rescuedBuddies } = useGameStore();

  const isCustomLevel = selectedWorld === 3 && levelGridCoords.length === 64; // Level 24

  // Get island theme colors
  const getIslandColors = () => {
    if (isCustomLevel) {
      return { top: '#7dd3fc', side: '#0f172a' };
    }
    switch (selectedWorld) {
      case 1: return { top: '#ff91d0', side: '#a865d4' }; // Jelly
      case 2: return { top: '#49e26a', side: '#82542a' }; // Dino Valley
      case 3: return { top: '#1c1f2e', side: '#00ccff' }; // Cosmo Station
      case 4: return { top: '#4ccfe8', side: '#005c99' }; // Coral Reef
      case 5: return { top: '#ecf3f9', side: '#7bc1e0' }; // Ice Castle
      case 6: return { top: '#21222b', side: '#ff3333' }; // Volcanic Lava
      default: return { top: '#8be9fd', side: '#6272a4' };
    }
  };

  const islandColors = getIslandColors();

  // Compute platform boundary center
  const minX = levelGridCoords.length > 0 ? Math.min(...levelGridCoords.map(c => c.x)) : 0;
  const maxX = levelGridCoords.length > 0 ? Math.max(...levelGridCoords.map(c => c.x)) : 7;
  const minZ = levelGridCoords.length > 0 ? Math.min(...levelGridCoords.map(c => c.z)) : 0;
  const maxZ = levelGridCoords.length > 0 ? Math.max(...levelGridCoords.map(c => c.z)) : 7;

  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;

  return (
    <div className="canvas3d-container">
      {/* Blurred DOF backdrop overlay */}
      <div className="background-dof-overlay" />

      {/* Cosmic background details */}
      <div className="space-star-glow" style={{ top: '12%', left: '10%', color: '#38bdf8', fontSize: '20px' }}>✦</div>
      <div className="space-star-glow" style={{ top: '8%', left: '45%', color: '#e879f9', fontSize: '14px' }}>✦</div>
      <div className="space-star-glow" style={{ top: '24%', right: '12%', color: '#c084fc', fontSize: '24px' }}>✦</div>
      <div className="space-star-glow" style={{ bottom: '15%', left: '6%', color: '#f472b6', fontSize: '18px' }}>✦</div>
      <div className="space-star-glow" style={{ bottom: '22%', right: '14%', color: '#38bdf8', fontSize: '16px' }}>✦</div>
      
      <div className="space-planet" style={{ top: '6%', right: '8%', width: '90px', height: '90px', background: 'radial-gradient(circle at 30% 30%, #38bdf8, #1d4ed8, #0f172a)' }} />
      <div className="space-planet" style={{ bottom: '20%', left: '8%', width: '70px', height: '70px', background: 'radial-gradient(circle at 30% 30%, #f472b6, #db2777, #4c0519)' }} />

      <Canvas shadows gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
        <OrthographicCamera
          makeDefault
          zoom={44}
          position={[5, 5, 5]}
          near={0.1}
          far={100}
        />
        
        <CameraController />

        <ambientLight intensity={0.65} />
        
        <directionalLight
          position={[5, 10, 3]}
          intensity={1.3}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0005}
        />

        <directionalLight
          position={[-5, 4, -3]}
          intensity={0.55}
          color="#ffaa44"
        />

        <Environment preset="sunset" />

        <ContactShadows
          position={[cx, -0.41, cz]}
          opacity={0.6}
          scale={13}
          blur={1.6}
          far={1.5}
        />

        <EnvironmentProps />

        {/* --- MONOLITHIC GRID PLATFORMS --- */}
        <group position={[0, -0.4, 0]}>
          {/* Solid base slab underneath the 8x8 grid */}
          <RoundedBox args={[8.0, 0.4, 8.0]} radius={0.12} smoothness={4} position={[cx, -0.22, cz]} castShadow receiveShadow>
            <meshStandardMaterial color={islandColors.side} roughness={0.7} />
          </RoundedBox>

          {/* Neon glow edge border around base slab */}
          <RoundedBox args={[8.16, 0.42, 8.16]} radius={0.12} position={[cx, -0.21, cz]}>
            <meshBasicMaterial color={selectedWorld === 3 || isCustomLevel ? "#e879f9" : (selectedWorld === 2 ? "#4ade80" : "#ffb6d4")} />
          </RoundedBox>

          {/* Individual tiles layout sitting on top of the base slab */}
          {Array.from({ length: 8 }).map((_, i) =>
            Array.from({ length: 8 }).map((_, j) => {
              const tx = cx + i - 3.5;
              const tz = cz + j - 3.5;
              return (
                <RoundedBox key={`${i}-${j}`} args={[0.94, 0.1, 0.94]} radius={0.04} smoothness={3} position={[tx, 0.02, tz]} receiveShadow>
                  <meshStandardMaterial
                    color={islandColors.top}
                    roughness={0.45}
                    metalness={selectedWorld === 3 ? 0.6 : 0.0}
                  />
                </RoundedBox>
              );
            })
          )}

          {/* Level 24 Portal Archway */}
          {isCustomLevel && (
            <group position={[2, 0.05, -0.5]} rotation={[0, 0, 0]}>
              <RoundedBox args={[0.06, 0.8, 0.06]} radius={0.01} position={[-0.32, 0.4, 0]}>
                <meshBasicMaterial color="#38bdf8" />
              </RoundedBox>
              <RoundedBox args={[0.06, 0.8, 0.06]} radius={0.01} position={[0.32, 0.4, 0]}>
                <meshBasicMaterial color="#f472b6" />
              </RoundedBox>
              <RoundedBox args={[0.7, 0.06, 0.06]} radius={0.01} position={[0, 0.8, 0]}>
                <meshBasicMaterial color="#e879f9" />
              </RoundedBox>
              <mesh position={[0, 0.4, 0]}>
                <planeGeometry args={[0.58, 0.74]} />
                <meshPhysicalMaterial
                  color="#ec4899"
                  transparent
                  opacity={0.6}
                  roughness={0.1}
                  clearcoat={1.0}
                  transmission={0.4}
                />
              </mesh>
            </group>
          )}

          {/* Level 24 Pressure Plates & Floor Decals */}
          {isCustomLevel && (
            <group position={[0, 0.075, 0]}>
              <mesh position={[3, 0, 1]} rotation={[-Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
                <meshBasicMaterial color="#38bdf8" />
              </mesh>
              
              <mesh position={[4, 0, 3]}>
                <boxGeometry args={[0.35, 0.02, 0.35]} />
                <meshBasicMaterial color="#f472b6" />
              </mesh>
              
              <mesh position={[5, 0, 4]}>
                <boxGeometry args={[0.35, 0.02, 0.35]} />
                <meshBasicMaterial color="#f87171" />
              </mesh>
              
              <mesh position={[2, 0, 2]}>
                <boxGeometry args={[0.38, 0.02, 0.38]} />
                <meshBasicMaterial color="#94a3b8" />
              </mesh>
              
              <group position={[0, 0, 1.75]}>
                <mesh>
                  <boxGeometry args={[0.06, 0.01, 1.8]} />
                  <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
                </mesh>
                <mesh position={[0, 0, -0.9]} rotation={[Math.PI / 2, 0, 0]}>
                  <coneGeometry args={[0.12, 0.25, 4]} />
                  <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
                </mesh>
              </group>
              
              <group position={[2, 0, 2.75]}>
                <mesh>
                  <boxGeometry args={[0.08, 0.01, 3.8]} />
                  <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
                </mesh>
                <mesh position={[0, 0, -1.9]} rotation={[Math.PI / 2, 0, 0]}>
                  <coneGeometry args={[0.16, 0.35, 4]} />
                  <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
                </mesh>
              </group>
              
              <group position={[4, 0, 5.25]}>
                <mesh>
                  <boxGeometry args={[0.06, 0.01, 1.8]} />
                  <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
                </mesh>
                <mesh position={[0, 0, 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
                  <coneGeometry args={[0.12, 0.25, 4]} />
                  <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
                </mesh>
              </group>
            </group>
          )}
        </group>

        {/* --- BUDDIES BLOCKS --- */}
        <group>
          {buddies.map(b => (
            <Buddy3DBlock key={b.id} buddy={b} />
          ))}
        </group>

        {/* --- RESCUED CHEER PLATFORM --- */}
        {rescuedBuddies && rescuedBuddies.length > 0 && (
          <group position={[3.5, -2.2, 9.0]}>
            {/* Dark bottom base slab */}
            <RoundedBox args={[2.5, 0.3, 2.5]} radius={0.08} smoothness={3} position={[0, -0.15, 0]} castShadow receiveShadow>
              <meshStandardMaterial color={islandColors.side} roughness={0.7} />
            </RoundedBox>
            {/* Top green grass cover */}
            <RoundedBox args={[2.4, 0.08, 2.4]} radius={0.06} smoothness={3} position={[0, 0.04, 0]} receiveShadow>
              <meshStandardMaterial color="#22c55e" roughness={0.5} />
            </RoundedBox>
          </group>
        )}

        {/* --- RESCUED CHEERING BUDDIES --- */}
        <group>
          {rescuedBuddies && rescuedBuddies.map(b => (
            <Buddy3DBlock key={b.id} buddy={{
              ...b,
              state: 'cheering',
              animT: 0,
              jellyScale: b.scale,
              jellyOffset: [0, 0, 0],
              blinkTimer: 2,
              isBlinking: false,
              rainbowHue: 0,
              dir: { x: 0, y: 0, z: 1 }
            }} />
          ))}
        </group>

        {/* --- ATMOSPHERIC PARTICLES --- */}
        <WeatherParticles />

        <EffectComposer>
          <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={1.1} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
export default Game3DScene;
