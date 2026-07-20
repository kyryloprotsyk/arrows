import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store';
import type { BuddyBlock } from '../store';

interface Buddy3DBlockProps {
  buddy: BuddyBlock;
}

export const Buddy3DBlock: React.FC<Buddy3DBlockProps> = ({ buddy }) => {
  const meshRef = useRef<THREE.Group>(null);
  const propRef = useRef<THREE.Mesh>(null);
  const { selectedWorld, activeSkin, tapBlock } = useGameStore();

  // Rainbow hue cycle state
  const [rainbowColor, setRainbowColor] = useState<THREE.Color>(new THREE.Color('#ff00bb'));

  // Blinking eyes logic
  const [eyeScaleY, setEyeScaleY] = useState(1);
  const [blinkTimer, setBlinkTimer] = useState(2 + Math.random() * 3);

  // Dynamically generate face texture via Canvas 2D
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  // Setup texture once on mount
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    canvasRef.current = canvas;

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    textureRef.current = tex;

    return () => {
      tex.dispose();
    };
  }, []);

  // Redraw canvas vector assets on state change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 256, 256);

    // 1. Soft radial-gradient blushing cheeks
    const drawCheek = (cx: number, cy: number) => {
      const rad = 26;
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
      grad.addColorStop(0, 'rgba(255, 79, 164, 0.8)');
      grad.addColorStop(1, 'rgba(255, 79, 164, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    };
    drawCheek(52, 142);  // left cheek
    drawCheek(204, 142); // right cheek

    // 2. Glossy eyes
    const drawEye = (cx: number, cy: number, scaleY: number) => {
      ctx.save();
      if (scaleY < 0.25) {
        // Blinking lines
        ctx.strokeStyle = '#0b0218';
        ctx.lineWidth = 11;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy - 2);
        ctx.quadraticCurveTo(cx, cy + 9, cx + 16, cy - 2);
        ctx.stroke();
      } else {
        // Black pupils
        ctx.fillStyle = '#0b0218';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 18, 26 * scaleY, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dual reflection highlights
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx - 6, cy - 8 * scaleY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 6, cy + 6 * scaleY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    if (buddy.state === 'bump') {
      // Squinting > < eyes
      const drawSquint = (cx: number, cy: number, flip: boolean) => {
        ctx.strokeStyle = '#0b0218';
        ctx.lineWidth = 11;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (flip) {
          ctx.moveTo(cx - 14, cy - 10);
          ctx.lineTo(cx + 10, cy);
          ctx.lineTo(cx - 14, cy + 10);
        } else {
          ctx.moveTo(cx + 14, cy - 10);
          ctx.lineTo(cx - 10, cy);
          ctx.lineTo(cx + 14, cy + 10);
        }
        ctx.stroke();
      };
      drawSquint(68, 108, false);
      drawSquint(188, 108, true);
    } else {
      drawEye(68, 108, eyeScaleY);
      drawEye(188, 108, eyeScaleY);
    }

    // 3. Expressive vector mouth shapes
    ctx.strokeStyle = '#0b0218';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';

    if (buddy.state === 'bump') {
      // Frowning arc mouth
      ctx.beginPath();
      ctx.arc(128, 172, 16, Math.PI * 1.15, Math.PI * 1.85, false);
      ctx.stroke();
    } else if (buddy.state === 'anticipation' || buddy.state === 'escaping') {
      // Big open grin with red tongue inside
      ctx.save();
      ctx.beginPath();
      ctx.arc(128, 142, 18, 0, Math.PI, false);
      ctx.closePath();
      ctx.clip();
      
      ctx.fillStyle = '#0b0218';
      ctx.fillRect(100, 120, 60, 60);
      
      ctx.fillStyle = '#ff5b7f';
      ctx.beginPath();
      ctx.arc(128, 155, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Happy curve smile mouth
      ctx.beginPath();
      ctx.arc(128, 140, 14, 0, Math.PI, false);
      ctx.stroke();
    }

    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  }, [buddy.state, eyeScaleY]);

  // Animate eye blinking
  useFrame((state, delta) => {
    let t = blinkTimer - delta;
    if (t <= 0) {
      setEyeScaleY(0.1); // blink closed
      t = 2.5 + Math.random() * 4; // reset timer
      setTimeout(() => setEyeScaleY(1), 120); // reopen after 120ms
    }
    setBlinkTimer(t);

    // Propeller spinning animation
    if (propRef.current && (activeSkin === 'propeller' || buddy.type === 'rotator')) {
      propRef.current.rotation.y += delta * 12;
    }

    // Rainbow block color shifting
    if (buddy.type === 'rainbow') {
      const time = state.clock.getElapsedTime() * 0.8;
      const r = Math.sin(time) * 0.5 + 0.5;
      const g = Math.sin(time + 2) * 0.5 + 0.5;
      const b = Math.sin(time + 4) * 0.5 + 0.5;
      setRainbowColor(new THREE.Color(r, g, b));
    }
  });

  // Calculate base color for normal blocks based on world
  const getBlockColor = () => {
    if (buddy.type === 'rainbow') return rainbowColor;
    if (buddy.type === 'bomb') return new THREE.Color('#333344');
    if (buddy.type === 'key') return new THREE.Color('#ffcc00');
    if (buddy.type === 'chest') return new THREE.Color('#8b5a2b');
    if (buddy.type === 'rotator') return new THREE.Color('#00ccff');
    if (buddy.type === 'portal') {
      // Blue or orange portals
      const isBlue = buddy.id.includes('portal_group_0') || buddy.targetChestId?.includes('_0');
      return isBlue ? new THREE.Color('#0066ff') : new THREE.Color('#ff6600');
    }

    // Mapped hues based on world index
    const worldHues: Record<number, number> = {
      1: 335, // Jelly: Pink
      2: 140, // Dino: Green
      3: 260, // Cosmo: Cyber Purple
      4: 185, // Coral: Teal/Aqua
      5: 200, // Ice: Light Ice Blue
      6: 15   // Volcanic: Lava Red
    };
    
    // Hash block coordinates to get varied hue offsets within the world palette
    const hash = Math.abs(buddy.x * 7 + buddy.y * 13 + buddy.z * 17);
    const baseHue = worldHues[selectedWorld] ?? 335;
    const hueOffset = [0, 15, -15, 30][hash % 4];
    const finalHue = (baseHue + hueOffset) % 360;

    return new THREE.Color(`hsl(${finalHue}, 95%, 60%)`);
  };

  const blockColor = getBlockColor();

  // Handle material properties for specific worlds
  const roughness = selectedWorld === 1 ? 0.05 : selectedWorld === 5 ? 0.28 : 0.15;
  const clearcoat = selectedWorld === 3 ? 1.0 : selectedWorld === 1 ? 0.8 : 0.5;
  const transmission = selectedWorld === 4 ? 0.65 : selectedWorld === 5 ? 0.55 : 0; // Translucent for water & ice
  const opacity = selectedWorld === 4 ? 0.75 : selectedWorld === 5 ? 0.85 : 1.0;

  // Set rotation matrix to point arrow helper in buddy.dir
  const arrowDirection = new THREE.Vector3(buddy.dir.x, buddy.dir.y, buddy.dir.z).normalize();
  const arrowRotation = new THREE.Euler();
  
  if (arrowDirection.lengthSq() > 0) {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), arrowDirection);
    arrowRotation.setFromQuaternion(quaternion);
  }

  // Animation scaling/offsets based on buddy.state
  const scale = [...buddy.jellyScale] as [number, number, number];
  const offset = [...buddy.jellyOffset] as [number, number, number];

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    tapBlock(buddy.id);
  };

  return (
    <group
      ref={meshRef}
      position={[buddy.x, buddy.y * 1.05, buddy.z]} // vertical scale spacer
      scale={scale}
      onClick={handlePointerDown}
    >
      {/* Visual Offset anchor for wiggles */}
      <group position={offset}>
        {/* Core Buddy Cube */}
        <RoundedBox args={[0.9, 0.9, 0.9]} radius={0.12} smoothness={5} castShadow receiveShadow>
          <meshPhysicalMaterial
            color={blockColor}
            roughness={roughness}
            clearcoat={clearcoat}
            clearcoatRoughness={0.1}
            transmission={transmission}
            opacity={opacity}
            transparent={transmission > 0}
            metalness={selectedWorld === 3 ? 0.8 : 0.05} // Cyber cyber metal look
            reflectivity={0.9}
          />
        </RoundedBox>

        {/* --- DYNAMIC CANVAS FACE TEXTURE --- */}
        {buddy.type !== 'chest' && buddy.type !== 'portal' && textureRef.current && (
          <mesh position={[0, 0.05, 0.456]}>
            <planeGeometry args={[0.82, 0.82]} />
            <meshBasicMaterial map={textureRef.current} transparent depthWrite={false} />
          </mesh>
        )}

        {/* --- FLOAT GLOW ARROW --- */}
        {buddy.type !== 'chest' && buddy.type !== 'portal' && (
          <group position={[0, 0.58, 0]} rotation={arrowRotation}>
            {/* Arrow shaft */}
            <mesh position={[0, -0.05, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.16, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {/* Arrow head */}
            <mesh position={[0, 0.08, 0]}>
              <coneGeometry args={[0.09, 0.16, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {/* Neon bloom ring indicator */}
            <mesh position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.08, 0.015, 6, 16]} />
              <meshBasicMaterial color={buddy.type === 'rainbow' ? '#ff00bb' : '#00ffff'} />
            </mesh>
          </group>
        )}

        {/* --- SPECIAL BLOCK OVERLAYS --- */}
        {buddy.type === 'bomb' && (
          // Red glowing fuse
          <group position={[0, 0.5, 0]}>
            <mesh>
              <cylinderGeometry args={[0.02, 0.02, 0.18]} />
              <meshBasicMaterial color="#7a4212" />
            </mesh>
            <mesh position={[0, 0.09, 0]}>
              <sphereGeometry args={[0.04]} />
              <meshBasicMaterial color="#ffcc00" />
            </mesh>
          </group>
        )}

        {buddy.type === 'key' && (
          // Glowing gold key symbol floating above
          <group position={[0, 0.56, 0]} rotation={[0, Math.PI / 4, 0]}>
            <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.07, 0.02, 6, 12]} />
              <meshBasicMaterial color="#ffea00" />
            </mesh>
            <mesh position={[0, -0.06, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.16]} />
              <meshBasicMaterial color="#ffea00" />
            </mesh>
            <mesh position={[0.04, -0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.015, 0.015, 0.06]} />
              <meshBasicMaterial color="#ffea00" />
            </mesh>
          </group>
        )}

        {buddy.type === 'chest' && (
          // Chest metal brackets
          <group position={[0, 0, 0]}>
            <mesh position={[-0.46, 0, 0]}>
              <boxGeometry args={[0.01, 0.92, 0.2]} />
              <meshBasicMaterial color="#ffe45e" />
            </mesh>
            <mesh position={[0.46, 0, 0]}>
              <boxGeometry args={[0.01, 0.92, 0.2]} />
              <meshBasicMaterial color="#ffe45e" />
            </mesh>
            {/* Keyhole */}
            <mesh position={[0, 0, 0.46]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.01]} />
              <meshBasicMaterial color="#333" />
            </mesh>
          </group>
        )}

        {buddy.type === 'rotator' && (
          // Circular layout gears
          <group position={[0, 0.51, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh ref={propRef}>
              <boxGeometry args={[0.4, 0.04, 0.1]} />
              <meshBasicMaterial color="#00f0ff" />
            </mesh>
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <boxGeometry args={[0.4, 0.04, 0.1]} />
              <meshBasicMaterial color="#00f0ff" />
            </mesh>
          </group>
        )}

        {buddy.type === 'portal' && (
          // Portal vortex ring
          <mesh position={[0, 0.48, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.3, 0.04, 6, 16]} />
            <meshBasicMaterial color={blockColor} />
          </mesh>
        )}

        {/* --- SKINS / HATS --- */}
        {buddy.type !== 'chest' && activeSkin !== 'none' && (
          <group position={[0, 0.48, 0]}>
            {activeSkin === 'wizard' && (
              <group position={[0, 0.12, 0]}>
                {/* wizard cap */}
                <mesh>
                  <coneGeometry args={[0.35, 0.6, 12]} />
                  <meshStandardMaterial color="#4a0e4e" roughness={0.5} />
                </mesh>
                <mesh position={[0, -0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.32, 0.06, 6, 16]} />
                  <meshStandardMaterial color="#300a35" />
                </mesh>
                {/* Yellow stars */}
                <mesh position={[0, 0.08, 0.18]}>
                  <sphereGeometry args={[0.04]} />
                  <meshBasicMaterial color="#ffea00" />
                </mesh>
                <mesh position={[0.1, -0.06, -0.16]}>
                  <sphereGeometry args={[0.04]} />
                  <meshBasicMaterial color="#ffea00" />
                </mesh>
              </group>
            )}

            {activeSkin === 'crown' && (
              <group position={[0, 0.08, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.26, 0.28, 0.15, 12, 1, true]} />
                  <meshStandardMaterial color="#ffea00" metalness={0.9} roughness={0.1} side={THREE.DoubleSide} />
                </mesh>
                {/* Crown spikes */}
                {Array.from({ length: 6 }).map((_, sIdx) => {
                  const angle = (sIdx / 6) * Math.PI * 2;
                  const rad = 0.27;
                  return (
                    <mesh key={sIdx} position={[Math.cos(angle) * rad, 0.12, Math.sin(angle) * rad]} rotation={[0, -angle, 0.2]}>
                      <coneGeometry args={[0.05, 0.14, 4]} />
                      <meshStandardMaterial color="#ffea00" metalness={0.9} roughness={0.1} />
                    </mesh>
                  );
                })}
              </group>
            )}

            {activeSkin === 'cat' && (
              <group position={[0, 0.05, 0]}>
                {/* Left Ear */}
                <mesh position={[-0.26, 0.08, 0]} rotation={[0, 0, 0.25]}>
                  <coneGeometry args={[0.12, 0.22, 4]} />
                  <meshStandardMaterial color={blockColor} roughness={0.6} />
                </mesh>
                {/* Right Ear */}
                <mesh position={[0.26, 0.08, 0]} rotation={[0, 0, -0.25]}>
                  <coneGeometry args={[0.12, 0.22, 4]} />
                  <meshStandardMaterial color={blockColor} roughness={0.6} />
                </mesh>
              </group>
            )}

            {activeSkin === 'tophat' && (
              <group position={[0, 0.18, 0]}>
                {/* Tophat cylinder */}
                <mesh>
                  <cylinderGeometry args={[0.22, 0.22, 0.36, 12]} />
                  <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
                </mesh>
                {/* Brim */}
                <mesh position={[0, -0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.34, 0.34, 0.02, 16]} />
                  <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
                </mesh>
                {/* Red ribbon band */}
                <mesh position={[0, -0.12, 0]}>
                  <cylinderGeometry args={[0.23, 0.23, 0.06, 12]} />
                  <meshBasicMaterial color="#ff0044" />
                </mesh>
              </group>
            )}

            {activeSkin === 'chef' && (
              <group position={[0, 0.16, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.24, 0.24, 0.24, 12]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.8} />
                </mesh>
                <mesh position={[0, 0.18, 0]}>
                  <sphereGeometry args={[0.28]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.8} />
                </mesh>
              </group>
            )}

            {activeSkin === 'propeller' && (
              <group position={[0, 0.08, 0]}>
                {/* Red cap */}
                <mesh>
                  <sphereGeometry args={[0.12, 8, 8]} />
                  <meshStandardMaterial color="#ff3333" />
                </mesh>
                {/* Propeller axle */}
                <mesh position={[0, 0.14, 0]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.14]} />
                  <meshStandardMaterial color="#bbb" />
                </mesh>
                {/* Propeller blades */}
                <mesh ref={propRef} position={[0, 0.2, 0]}>
                  <boxGeometry args={[0.62, 0.015, 0.08]} />
                  <meshStandardMaterial color="#ffe45e" roughness={0.6} />
                </mesh>
              </group>
            )}

            {activeSkin === 'rainbow' && (
              <group position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
                {/* Halo */}
                <mesh>
                  <torusGeometry args={[0.24, 0.02, 6, 16]} />
                  <meshBasicMaterial color={rainbowColor} />
                </mesh>
              </group>
            )}

            {activeSkin === 'dragon' && (
              <group position={[0, 0.06, 0.08]} rotation={[0.1, 0, 0]}>
                {/* Dragon horns */}
                <mesh position={[-0.18, 0.14, -0.1]} rotation={[0.4, 0, -0.2]}>
                  <coneGeometry args={[0.06, 0.26, 6]} />
                  <meshStandardMaterial color="#2d8b24" roughness={0.3} />
                </mesh>
                <mesh position={[0.18, 0.14, -0.1]} rotation={[0.4, 0, 0.2]}>
                  <coneGeometry args={[0.06, 0.26, 6]} />
                  <meshStandardMaterial color="#2d8b24" roughness={0.3} />
                </mesh>
                {/* Scales */}
                <mesh position={[0, 0.08, -0.2]} rotation={[-0.4, 0, 0]}>
                  <coneGeometry args={[0.05, 0.15, 4]} />
                  <meshStandardMaterial color="#ffa21a" />
                </mesh>
              </group>
            )}

            {activeSkin === 'golden_crown' && (
              <group position={[0, 0.16, 0]}>
                {/* Giant crown */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.3, 0.35, 0.25, 12, 1, true]} />
                  <meshStandardMaterial color="#ffd700" metalness={0.95} roughness={0.05} side={THREE.DoubleSide} />
                </mesh>
                {Array.from({ length: 8 }).map((_, sIdx) => {
                  const angle = (sIdx / 8) * Math.PI * 2;
                  const rad = 0.32;
                  return (
                    <mesh key={sIdx} position={[Math.cos(angle) * rad, 0.2, Math.sin(angle) * rad]} rotation={[0, -angle, 0.25]}>
                      <coneGeometry args={[0.06, 0.24, 4]} />
                      <meshStandardMaterial color="#ffd700" metalness={0.95} roughness={0.05} />
                    </mesh>
                  );
                })}
              </group>
            )}
          </group>
        )}
      </group>
    </group>
  );
};
