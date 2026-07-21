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
  const { selectedWorld, activeSkin, tapBlock, levelGridCoords } = useGameStore();

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
    const drawEye = (cx: number, cy: number, scaleY: number, isWink = false) => {
      ctx.save();
      if (scaleY < 0.25 || isWink) {
        // Curved line for closed/winking eye
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

    if (buddy.state === 'bump' || buddy.face === 'screaming') {
      drawSquint(68, 118, false);
      drawSquint(188, 118, true);
    } else if (buddy.face === 'wink') {
      drawEye(68, 118, eyeScaleY, false); // left open
      drawEye(188, 118, 0, true);         // right wink
    } else if (buddy.face === 'sleep') {
      drawEye(68, 118, 0, true);          // left closed
      drawEye(188, 118, 0, true);         // right closed
      
      // Draw zZ floating text
      ctx.fillStyle = '#d3c2ff';
      ctx.font = 'bold 32px var(--font-bubbly)';
      ctx.fillText('zZ', 170, 75);
    } else {
      drawEye(68, 118, eyeScaleY);
      drawEye(188, 118, eyeScaleY);
    }

    // Slanted worried eyebrows
    if (buddy.face === 'worried') {
      ctx.strokeStyle = '#0b0218';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      // Left eyebrow
      ctx.beginPath();
      ctx.moveTo(48, 80);
      ctx.lineTo(84, 92);
      ctx.stroke();
      // Right eyebrow
      ctx.beginPath();
      ctx.moveTo(208, 80);
      ctx.lineTo(172, 92);
      ctx.stroke();
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
    } else if (buddy.face === 'screaming') {
      // Large shouting open mouth
      ctx.fillStyle = '#0b0218';
      ctx.beginPath();
      ctx.ellipse(128, 165, 18, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Pink tongue
      ctx.fillStyle = '#ff5b7f';
      ctx.beginPath();
      ctx.ellipse(128, 178, 12, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (buddy.face === 'worried') {
      // Tiny worried mouth
      ctx.beginPath();
      ctx.arc(128, 168, 10, Math.PI, 0, false);
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
  }, [buddy.state, eyeScaleY, buddy.face, buddy.dir, buddy.faceSide]);

  // Animate eye blinking and shake wiggles
  useFrame((state, delta) => {
    let t = blinkTimer - delta;
    if (t <= 0) {
      setEyeScaleY(0.1); // blink closed
      t = 2.5 + Math.random() * 4; // reset timer
      setTimeout(() => setEyeScaleY(1), 120); // reopen after 120ms
    }
    setBlinkTimer(t);

    // Propeller spinning animation
    const blockSkin = buddy.skin || activeSkin;
    if (propRef.current && (blockSkin === 'propeller' || buddy.type === 'rotator')) {
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

    // Perpendicular blocked shake animation
    if (buddy.state === 'bump') {
      const shakeAmt = Math.sin(state.clock.getElapsedTime() * 55) * 0.08;
      if (buddy.dir.x !== 0) {
        meshRef.current?.rotation.set(0, 0, shakeAmt);
      } else {
        meshRef.current?.rotation.set(shakeAmt, 0, 0);
      }
    } else if (buddy.state === 'cheering') {
      const timeOffset = buddy.x * 2.3;
      const jumpY = Math.abs(Math.sin(state.clock.getElapsedTime() * 6.5 + timeOffset)) * 0.22;
      meshRef.current?.position.set(buddy.x, buddy.y + jumpY, buddy.z);
      const wobble = Math.sin(state.clock.getElapsedTime() * 12 + timeOffset) * 0.06;
      meshRef.current?.rotation.set(0, wobble, 0);
    } else if (buddy.state === 'idle') {
      meshRef.current?.rotation.set(0, 0, 0);
    }
  });

  // Calculate base color for normal blocks based on world
  const getBlockColor = () => {
    if (buddy.colorOverride) return new THREE.Color(buddy.colorOverride);
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

  // Decide face position and rotation:
  // Since the body group is rotated to orient the face, the face is always on the local +Z side.
  const useFrontLeft = buddy.dir.x < 0 || buddy.dir.z > 0;
  const faceSide = buddy.faceSide || (useFrontLeft ? 'X' : 'Z');
  const bodyRotationY = faceSide === 'X' ? Math.PI / 2 : 0;

  // Calculate arrow rotation relative to the block's rotated local coordinate system
  const localDir = new THREE.Vector3(buddy.dir.x, buddy.dir.y, buddy.dir.z)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), -bodyRotationY);
  
  let arrowAngle = 0;
  const ldx = localDir.x;
  const ldz = localDir.z;
  
  if (ldx < -0.5) arrowAngle = 0;          // moves up-left (-X local) -> points UP
  else if (ldx > 0.5) arrowAngle = Math.PI; // moves down-right (+X local) -> points DOWN
  else if (ldz < -0.5) arrowAngle = Math.PI / 2; // moves up-right (-Z local) -> points RIGHT
  else if (ldz > 0.5) arrowAngle = -Math.PI / 2; // moves down-left (+Z local) -> points LEFT

  // Position face and decals relative to the new bulkier 0.96 size cube
  const facePosition: [number, number, number] = [0, 0, 0.485];
  const faceRotation: [number, number, number] = [0, 0, 0];

  const blockSkin = buddy.skin || (buddy.id !== 'menu_buddy' ? activeSkin : 'none');
  const isCustomLevel = selectedWorld === 3 && levelGridCoords.length === 64; // Level 24

  return (
    <group
      ref={meshRef}
      position={[buddy.x, buddy.y * 1.05, buddy.z]} // vertical scale spacer
      scale={scale}
      onClick={handlePointerDown}
    >
      {/* Visual Offset anchor for wiggles with Y-axis orientation */}
      <group position={offset} rotation={[0, bodyRotationY, 0]}>
        {/* Core Buddy Cube: 0.96 size and 0.16 radius for a bulkier, softer, premium squishy toy look */}
        <RoundedBox args={[0.96, 0.96, 0.96]} radius={0.16} smoothness={5} castShadow receiveShadow>
          <meshPhysicalMaterial
            color={blockColor}
            roughness={0.35} // soft rubbery matte vinyl finish
            clearcoat={0.35} // subtle glossy sheen on edges
            clearcoatRoughness={0.15}
            transmission={transmission}
            opacity={opacity}
            transparent={transmission > 0}
            metalness={0.02} // non-metallic toy feel
            reflectivity={0.7}
            emissive={blockColor}
            emissiveIntensity={0.22} // Slightly higher glow for SSS simulation
          />
        </RoundedBox>

        {/* Cute stubby legs/feet at bottom corners */}
        {buddy.type !== 'portal' && (
          <group position={[0, -0.48, 0]}>
            <mesh position={[-0.32, -0.06, -0.32]}>
              <cylinderGeometry args={[0.085, 0.085, 0.12, 8]} />
              <meshPhysicalMaterial color={blockColor} roughness={roughness} clearcoat={clearcoat} emissive={blockColor} emissiveIntensity={0.1} />
            </mesh>
            <mesh position={[0.32, -0.06, -0.32]}>
              <cylinderGeometry args={[0.085, 0.085, 0.12, 8]} />
              <meshPhysicalMaterial color={blockColor} roughness={roughness} clearcoat={clearcoat} emissive={blockColor} emissiveIntensity={0.1} />
            </mesh>
            <mesh position={[-0.32, -0.06, 0.32]}>
              <cylinderGeometry args={[0.085, 0.085, 0.12, 8]} />
              <meshPhysicalMaterial color={blockColor} roughness={roughness} clearcoat={clearcoat} emissive={blockColor} emissiveIntensity={0.1} />
            </mesh>
            <mesh position={[0.32, -0.06, 0.32]}>
              <cylinderGeometry args={[0.085, 0.085, 0.12, 8]} />
              <meshPhysicalMaterial color={blockColor} roughness={roughness} clearcoat={clearcoat} emissive={blockColor} emissiveIntensity={0.1} />
            </mesh>
          </group>
        )}

        {/* Stubby arms / hands sticking out left and right — at mid-body height */}
        {buddy.type !== 'portal' && (
          <group position={[0, -0.06, 0]}>
            {/* Left arm — extends -X */}
            <mesh position={[-0.58, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.075, 0.07, 0.2, 10]} />
              <meshPhysicalMaterial color={blockColor} roughness={roughness} clearcoat={clearcoat} emissive={blockColor} emissiveIntensity={0.1} />
            </mesh>
            {/* Left hand — small oval mitten pad, slightly tilted down */}
            <mesh position={[-0.72, -0.04, 0.01]} rotation={[0.3, 0, -0.3]}>
              <sphereGeometry args={[0.1, 10, 8]} />
              <meshPhysicalMaterial color={blockColor} roughness={roughness} clearcoat={clearcoat} emissive={blockColor} emissiveIntensity={0.1} />
            </mesh>
            {/* Right arm — extends +X */}
            <mesh position={[0.58, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.075, 0.07, 0.2, 10]} />
              <meshPhysicalMaterial color={blockColor} roughness={roughness} clearcoat={clearcoat} emissive={blockColor} emissiveIntensity={0.1} />
            </mesh>
            {/* Right hand — small oval mitten pad, slightly tilted down */}
            <mesh position={[0.72, -0.04, 0.01]} rotation={[0.3, 0, 0.3]}>
              <sphereGeometry args={[0.1, 10, 8]} />
              <meshPhysicalMaterial color={blockColor} roughness={roughness} clearcoat={clearcoat} emissive={blockColor} emissiveIntensity={0.1} />
            </mesh>
          </group>
        )}

        {/* --- DYNAMIC CANVAS FACE TEXTURE --- */}
        {buddy.type !== 'chest' && buddy.type !== 'portal' && textureRef.current && (
          <mesh position={facePosition} rotation={faceRotation}>
            <planeGeometry args={[0.82, 0.82]} />
            <meshBasicMaterial map={textureRef.current} transparent depthWrite={false} />
          </mesh>
        )}

        {/* --- TACTILE 3D SIDE ARROW BADGE --- */}
        {buddy.type !== 'chest' && buddy.type !== 'portal' && isCustomLevel && buddy.state !== 'cheering' && (
          <group position={[0.49, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            {/* Dark background badge plate */}
            <RoundedBox args={[0.26, 0.48, 0.02]} radius={0.06} smoothness={4} position={[0, 0, -0.012]} castShadow receiveShadow>
              <meshStandardMaterial color="#111116" roughness={0.65} opacity={0.7} transparent />
            </RoundedBox>
            
            {/* Arrow indicator */}
            <group rotation={[0, 0, arrowAngle]}>
              {/* Chubby arrow shaft */}
              <mesh position={[0, -0.06, 0.015]} castShadow>
                <cylinderGeometry args={[0.04, 0.04, 0.22, 12]} />
                <meshStandardMaterial color="#ffffff" roughness={0.25} />
              </mesh>
              {/* Chubby arrow head */}
              <mesh position={[0, 0.1, 0.015]} castShadow>
                <coneGeometry args={[0.09, 0.18, 12]} />
                <meshStandardMaterial color="#ffffff" roughness={0.25} />
              </mesh>
            </group>
          </group>
        )}

        {/* --- FLOAT GLOW ARROW (hidden for level 24 face arrows) --- */}
        {buddy.type !== 'chest' && buddy.type !== 'portal' && !isCustomLevel && buddy.state !== 'cheering' && (
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
        {buddy.type !== 'chest' && blockSkin !== 'none' && (
          <group position={[0, 0.48, 0]}>
            {blockSkin === 'wizard' && (
              <group position={[0, 0.12, 0]}>
                {/* wizard cap */}
                <mesh>
                  <coneGeometry args={[0.32, 0.6, 12]} />
                  <meshStandardMaterial color="#1e4ed8" roughness={0.4} /> {/* Royal Blue Cap */}
                </mesh>
                <mesh position={[0, -0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.3, 0.05, 6, 16]} />
                  <meshStandardMaterial color="#fbbf24" /> {/* Yellow Band */}
                </mesh>
                {/* Star on hat */}
                <mesh position={[0, 0.08, 0.16]}>
                  <sphereGeometry args={[0.045]} />
                  <meshBasicMaterial color="#fbbf24" />
                </mesh>
                {/* Wizard Wand in right hand */}
                <group position={[0.545, -0.22, 0.08]} rotation={[0.2, -0.1, 0.45]}>
                  <mesh>
                    <cylinderGeometry args={[0.015, 0.015, 0.36]} />
                    <meshStandardMaterial color="#854d0e" roughness={0.7} />
                  </mesh>
                  <mesh position={[0, 0.2, 0]}>
                    <sphereGeometry args={[0.05, 8, 8]} />
                    <meshBasicMaterial color="#fbbf24" />
                  </mesh>
                </group>
              </group>
            )}

            {blockSkin === 'crown' && (
              <group position={[0, 0.08, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.26, 0.28, 0.15, 12, 1, true]} />
                  <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.1} side={THREE.DoubleSide} />
                </mesh>
                {/* Crown spikes */}
                {Array.from({ length: 6 }).map((_, sIdx) => {
                  const angle = (sIdx / 6) * Math.PI * 2;
                  const rad = 0.27;
                  return (
                    <mesh key={sIdx} position={[Math.cos(angle) * rad, 0.12, Math.sin(angle) * rad]} rotation={[0, -angle, 0.2]}>
                      <coneGeometry args={[0.05, 0.14, 4]} />
                      <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.1} />
                    </mesh>
                  );
                })}
              </group>
            )}

            {blockSkin === 'cat' && (
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

            {blockSkin === 'tophat' && (
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

            {blockSkin === 'chef' && (
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

            {blockSkin === 'propeller' && (
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

            {blockSkin === 'rainbow' && (
              <group position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
                {/* Halo */}
                <mesh>
                  <torusGeometry args={[0.24, 0.02, 6, 16]} />
                  <meshBasicMaterial color={rainbowColor} />
                </mesh>
              </group>
            )}

            {blockSkin === 'dragon' && (
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

            {blockSkin === 'golden_crown' && (
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

            {blockSkin === 'sprout' && (
              <group position={[0, 0.45, 0]}>
                {/* Stem */}
                <mesh position={[0, 0.08, 0]}>
                  <cylinderGeometry args={[0.015, 0.02, 0.16, 6]} />
                  <meshStandardMaterial color="#55aa33" roughness={0.7} />
                </mesh>
                {/* Left Leaf */}
                <mesh position={[-0.07, 0.15, 0]} rotation={[0, 0, 0.5]}>
                  <boxGeometry args={[0.15, 0.03, 0.1]} />
                  <meshStandardMaterial color="#8ae922" roughness={0.5} />
                </mesh>
                {/* Right Leaf */}
                <mesh position={[0.07, 0.15, 0]} rotation={[0, 0, -0.5]}>
                  <boxGeometry args={[0.15, 0.03, 0.1]} />
                  <meshStandardMaterial color="#8ae922" roughness={0.5} />
                </mesh>
              </group>
            )}

            {blockSkin === 'sleep' && (
              <group position={[0, 0.45, 0]} rotation={[0.2, 0, 0.15]}>
                {/* Soft pompom cuff */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.25, 0.05, 8, 16]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.9} />
                </mesh>
                {/* Main purple body cone */}
                <mesh position={[0, 0.15, -0.05]} rotation={[-0.3, 0, 0.1]}>
                  <coneGeometry args={[0.22, 0.36, 12]} />
                  <meshStandardMaterial color="#8844ff" roughness={0.6} />
                </mesh>
                {/* Pompom tail ball */}
                <mesh position={[0.08, 0.3, -0.14]}>
                  <sphereGeometry args={[0.07, 8, 8]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.9} />
                </mesh>
              </group>
            )}

            {blockSkin === 'flower' && (
              <group position={[0, 0.46, 0]}>
                {/* Vine Crown torus */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.28, 0.02, 6, 16]} />
                  <meshStandardMaterial color="#166534" />
                </mesh>
                {/* Flower 1 */}
                <mesh position={[0.24, 0.02, 0.1]} rotation={[0.1, 0, 0.2]}>
                  <sphereGeometry args={[0.055]} />
                  <meshStandardMaterial color="#ec4899" />
                </mesh>
                <mesh position={[0.24, 0.02, 0.1]} scale={[0.5, 0.5, 0.5]}>
                  <sphereGeometry args={[0.045]} />
                  <meshBasicMaterial color="#fbbf24" />
                </mesh>
                {/* Flower 2 */}
                <mesh position={[-0.24, 0.02, -0.1]} rotation={[-0.1, 0, -0.2]}>
                  <sphereGeometry args={[0.055]} />
                  <meshStandardMaterial color="#f43f5e" />
                </mesh>
                <mesh position={[-0.24, 0.02, -0.1]} scale={[0.5, 0.5, 0.5]}>
                  <sphereGeometry args={[0.045]} />
                  <meshBasicMaterial color="#fbbf24" />
                </mesh>
                {/* Flower 3 */}
                <mesh position={[0, 0.02, 0.26]} rotation={[0.2, 0, 0]}>
                  <sphereGeometry args={[0.055]} />
                  <meshStandardMaterial color="#fb7185" />
                </mesh>
                <mesh position={[0, 0.02, 0.26]} scale={[0.5, 0.5, 0.5]}>
                  <sphereGeometry args={[0.045]} />
                  <meshBasicMaterial color="#fbbf24" />
                </mesh>
              </group>
            )}
          </group>
        )}
      </group>
    </group>
  );
};
