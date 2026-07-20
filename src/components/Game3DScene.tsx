import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, Environment, OrthographicCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { Buddy3DBlock } from './Buddy3DBlock';

// --- Camera Controller to smoothly orbit rotation ---
const CameraController: React.FC = () => {
  const { rotState, buddies } = useGameStore();
  const { camera } = useThree();
  
  // Track target angle (90 degree steps)
  const targetAngle = rotState * (Math.PI / 2);
  const currentAngle = useRef(targetAngle);

  // Focus look-at center
  const targetLookAt = new THREE.Vector3(0, 0, 0);

  // Compute cluster center for looking at
  useEffect(() => {
    if (buddies.length > 0) {
      let sx = 0, sy = 0, sz = 0;
      buddies.forEach(b => { sx += b.x; sy += b.y; sz += b.z; });
      targetLookAt.set(sx / buddies.length, (sy / buddies.length) * 0.5, sz / buddies.length);
    }
  }, [buddies]);

  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    // Smooth angle lerping
    const angleDiff = targetAngle - currentAngle.current;
    
    // Normalize difference for shortest path rotation
    const shortestDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
    currentAngle.current += shortestDiff * Math.min(1.0, delta * 8.0);

    // Smooth lookAt target lerp
    currentLookAt.current.lerp(targetLookAt, delta * 6);

    // Orbit Camera position math (Isometric angle)
    const distance = 8.5; // distance from center
    const height = 6.2; // height elevation
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
      // Update Y positions based on world weather
      if (selectedWorld === 1 || selectedWorld === 6) {
        // Bubbles / Magma Embers rising upwards
        p.pos.y += p.speed * delta * 0.8;
        if (p.pos.y > 6) {
          p.pos.y = -2;
          p.pos.x = (Math.random() - 0.5) * 12;
          p.pos.z = (Math.random() - 0.5) * 12;
        }
      } else {
        // Leaves / Rain / Snow falling downwards
        p.pos.y -= p.speed * delta * 0.9;
        if (p.pos.y < -2) {
          p.pos.y = 6;
          p.pos.x = (Math.random() - 0.5) * 12;
          p.pos.z = (Math.random() - 0.5) * 12;
        }
      }

      // Wobble drift
      const wobble = Math.sin(time * p.wobbleSpeed + p.seed) * p.wobbleRange * delta;
      p.pos.x += wobble;
      p.pos.z += Math.cos(time * p.wobbleSpeed + p.seed) * p.wobbleRange * delta;

      // Update geometry array
      positions[idx * 3] = p.pos.x;
      positions[idx * 3 + 1] = p.pos.y;
      positions[idx * 3 + 2] = p.pos.z;
    });

    geomRef.current.attributes.position.needsUpdate = true;
  });

  // Calculate particle color
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

// --- Main 3D Scene viewport ---
export const Game3DScene: React.FC = () => {
  const { selectedWorld, levelGridCoords, buddies } = useGameStore();

  const isCustomLevel = selectedWorld === 3 && levelGridCoords.length === 64; // Level 24

  // Get island theme details
  const getIslandColors = () => {
    if (isCustomLevel) {
      // Glow blue top, dark cyber side
      return { top: '#7dd3fc', side: '#0f172a' };
    }
    switch (selectedWorld) {
      case 1: return { top: '#ff91d0', side: '#a865d4' }; // Jelly
      case 2: return { top: '#49e26a', side: '#82542a' }; // Dino Valley
      case 3: return { top: '#1c1f2e', side: '#00ccff' }; // Cosmo Station (Steel & Neon)
      case 4: return { top: '#4ccfe8', side: '#005c99' }; // Coral Reef
      case 5: return { top: '#ecf3f9', side: '#7bc1e0' }; // Ice Castle
      case 6: return { top: '#21222b', side: '#ff3333' }; // Volcanic Lava
      default: return { top: '#8be9fd', side: '#6272a4' };
    }
  };

  const islandColors = getIslandColors();

  return (
    <div className="canvas3d-container">
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
          zoom={44} // Isometric view scale
          position={[5, 5, 5]}
          near={0.1}
          far={100}
        />
        
        <CameraController />

        {/* Ambient environment lighting */}
        <ambientLight intensity={0.6} />
        
        {/* Soft sun highlights */}
        <directionalLight
          position={[5, 10, 3]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0005}
        />

        <directionalLight
          position={[-5, 4, -3]}
          intensity={0.4}
        />

        {/* Sunset preset for wowed reflections */}
        <Environment preset="sunset" />

        {/* --- FLOATING ISLAND GRID PLATFORMS --- */}
        <group position={[0, -0.4, 0]}>
          {levelGridCoords.map((coord, idx) => (
            <group key={idx} position={[coord.x, 0, coord.z]}>
              {/* Dirt / Core bottom slab */}
              <RoundedBox args={[0.96, 0.4, 0.96]} radius={0.06} smoothness={3} position={[0, -0.22, 0]} castShadow receiveShadow>
                <meshStandardMaterial color={islandColors.side} roughness={0.7} />
              </RoundedBox>

              {/* Grass / Panel top cover */}
              <RoundedBox args={[0.94, 0.1, 0.94]} radius={0.04} smoothness={3} position={[0, 0.02, 0]} receiveShadow>
                <meshStandardMaterial
                  color={islandColors.top}
                  roughness={0.45}
                  metalness={selectedWorld === 3 ? 0.6 : 0.0}
                />
              </RoundedBox>
            </group>
          ))}

          {/* Level 24 Pink/Purple Neon glowing border around 8x8 slab */}
          {isCustomLevel && (
            <RoundedBox args={[8.16, 0.42, 8.16]} radius={0.12} position={[3.5, -0.21, 3.5]}>
              <meshBasicMaterial color="#e879f9" />
            </RoundedBox>
          )}

          {/* Level 24 Portal Archway */}
          {isCustomLevel && (
            <group position={[2, 0.05, -0.5]} rotation={[0, 0, 0]}>
              {/* Left Pillar */}
              <RoundedBox args={[0.06, 0.8, 0.06]} radius={0.01} position={[-0.32, 0.4, 0]}>
                <meshBasicMaterial color="#38bdf8" />
              </RoundedBox>
              {/* Right Pillar */}
              <RoundedBox args={[0.06, 0.8, 0.06]} radius={0.01} position={[0.32, 0.4, 0]}>
                <meshBasicMaterial color="#f472b6" />
              </RoundedBox>
              {/* Arch Top */}
              <RoundedBox args={[0.7, 0.06, 0.06]} radius={0.01} position={[0, 0.8, 0]}>
                <meshBasicMaterial color="#e879f9" />
              </RoundedBox>
              {/* Vortex Center */}
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
              {/* Blue Circular Button */}
              <mesh position={[3, 0, 1]} rotation={[-Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
                <meshBasicMaterial color="#38bdf8" />
              </mesh>
              
              {/* Pink Button Plate */}
              <mesh position={[4, 0, 3]}>
                <boxGeometry args={[0.35, 0.02, 0.35]} />
                <meshBasicMaterial color="#f472b6" />
              </mesh>
              
              {/* Red Button Plate */}
              <mesh position={[5, 0, 4]}>
                <boxGeometry args={[0.35, 0.02, 0.35]} />
                <meshBasicMaterial color="#f87171" />
              </mesh>
              
              {/* Grey slot plate */}
              <mesh position={[2, 0, 2]}>
                <boxGeometry args={[0.38, 0.02, 0.38]} />
                <meshBasicMaterial color="#94a3b8" />
              </mesh>
              
              {/* Wizard Guide Arrow (-Z direction) */}
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
              
              {/* Pink Guide Arrow to Portal (-Z direction) */}
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
              
              {/* Light Blue Guide Arrow (+Z direction) */}
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

        {/* --- ATMOSPHERIC PARTICLES --- */}
        <WeatherParticles />

        {/* --- NEON GLOW BLOOM COMPOSE FILTER --- */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={1.1} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
export default Game3DScene;
