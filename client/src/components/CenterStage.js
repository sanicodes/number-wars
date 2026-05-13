import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Text, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { getCharacter } from '../characters';
import {
  ANNOUNCE_DELAY_MS,
  BEAT_GAP_MS,
  DeathBurst,
  FinisherAttack,
  Shockwave,
  SoulColumn,
  ScorchMark,
  ChargeAura,
  ease,
} from '../animations/finishers';

// ── Stage geometry ─────────────────────────────────────────────────────────
const ARENA_RADIUS = 5.2;        // perimeter of the dais
const PLAYER_RING_RADIUS = 3.2;  // where players stand
const FLOOR_Y = -1.0;            // y of arena floor (players stand at 0)

const positionFor = (index, total) => {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  return {
    x: Math.cos(angle) * PLAYER_RING_RADIUS,
    y: 0,
    z: Math.sin(angle) * PLAYER_RING_RADIUS,
  };
};

// ── Arena environment (floating sky coliseum) ─────────────────────────────
function FloatingDebris() {
  const groupRef = useRef();
  const chunks = useMemo(() => {
    const out = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const r = 8 + Math.random() * 9;
      const y = -3 - Math.random() * 6;
      out.push({
        baseAngle: a,
        radius: r,
        y,
        speed: 0.04 + Math.random() * 0.06,
        scale: 0.18 + Math.random() * 0.55,
        tilt: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.4,
        kind: Math.random() > 0.5 ? 'rock' : 'shard',
      });
    }
    return out;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const c = chunks[i];
      const a = c.baseAngle + t * c.speed;
      child.position.set(Math.cos(a) * c.radius, c.y + Math.sin(t * 0.4 + i) * 0.3, Math.sin(a) * c.radius);
      child.rotation.y = t * c.spin + i;
      child.rotation.x = c.tilt + Math.sin(t * 0.5 + i) * 0.2;
    });
  });

  return (
    <group ref={groupRef}>
      {chunks.map((c, i) => (
        <mesh key={i} scale={c.scale}>
          {c.kind === 'rock' ? (
            <dodecahedronGeometry args={[1, 0]} />
          ) : (
            <tetrahedronGeometry args={[1.2, 0]} />
          )}
          <meshStandardMaterial
            color="#1b1f44"
            emissive="#312e81"
            emissiveIntensity={0.35}
            roughness={0.85}
            metalness={0.25}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

function BrokenTiers() {
  // Asymmetric, descending stone fragments hanging below the dais.
  const fragments = useMemo(() => {
    const out = [];
    const tiers = [
      { r: ARENA_RADIUS - 0.05, y: FLOOR_Y - 0.45, segments: 14, segLen: 0.32, drop: 0 },
      { r: ARENA_RADIUS - 0.6, y: FLOOR_Y - 1.4, segments: 11, segLen: 0.34, drop: 0.12 },
      { r: ARENA_RADIUS - 1.5, y: FLOOR_Y - 2.6, segments: 8, segLen: 0.36, drop: 0.25 },
      { r: ARENA_RADIUS - 2.4, y: FLOOR_Y - 3.7, segments: 5, segLen: 0.38, drop: 0.5 },
    ];
    tiers.forEach((tier, tIdx) => {
      for (let i = 0; i < tier.segments; i++) {
        const a = (i / tier.segments) * Math.PI * 2 + (tIdx % 2 ? 0.13 : 0);
        // Random gaps to feel "broken"
        if (Math.random() < 0.18 && tIdx > 0) continue;
        out.push({
          x: Math.cos(a) * tier.r,
          z: Math.sin(a) * tier.r,
          y: tier.y - Math.random() * tier.drop,
          yaw: a + Math.PI / 2,
          w: tier.segLen * (2.0 + Math.random() * 0.8),
          h: 0.35 + Math.random() * 0.6,
          d: 0.5 + Math.random() * 0.4,
          tilt: (Math.random() - 0.5) * 0.2,
        });
      }
    });
    return out;
  }, []);

  return (
    <group>
      {fragments.map((f, i) => (
        <mesh key={i} position={[f.x, f.y, f.z]} rotation={[f.tilt, f.yaw, 0]}>
          <boxGeometry args={[f.w, f.h, f.d]} />
          <meshStandardMaterial
            color="#161a3d"
            emissive="#2b1d5a"
            emissiveIntensity={0.45}
            roughness={0.85}
            metalness={0.2}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

function Godray() {
  // A soft volumetric-feeling cone from above, additive blended.
  const meshRef = useRef();
  useFrame((state) => {
    if (!meshRef.current || !meshRef.current.material) return;
    const t = state.clock.elapsedTime;
    meshRef.current.material.opacity = 0.16 + Math.sin(t * 0.6) * 0.025;
    meshRef.current.rotation.y = t * 0.08;
  });
  return (
    <mesh ref={meshRef} position={[0, 4.5, 0]}>
      <coneGeometry args={[5.5, 11, 48, 1, true]} />
      <meshBasicMaterial
        color="#fde68a"
        transparent
        opacity={0.18}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function Arena() {
  const ringRef = useRef();
  const innerSigilRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ringRef.current && ringRef.current.material) {
      ringRef.current.material.opacity = 0.85 + Math.sin(t * 1.4) * 0.12;
    }
    if (innerSigilRef.current) {
      innerSigilRef.current.rotation.z = t * 0.25;
    }
  });
  const pillars = useMemo(() => {
    const out = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.PI / 6;
      out.push({
        x: Math.cos(a) * (ARENA_RADIUS + 0.45),
        z: Math.sin(a) * (ARENA_RADIUS + 0.45),
        angle: a,
      });
    }
    return out;
  }, []);

  return (
    <group>
      {/* Distant nebula sphere (inside view) — replaces the flat background */}
      <mesh>
        <sphereGeometry args={[80, 32, 32]} />
        <meshBasicMaterial
          color="#0a0d24"
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>

      {/* Nebula glow plates — purple/blue painterly tint behind the stage */}
      <mesh position={[0, 4, -30]}>
        <planeGeometry args={[60, 38]} />
        <meshBasicMaterial
          color="#4c1d95"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-12, -2, -22]}>
        <planeGeometry args={[28, 22]} />
        <meshBasicMaterial
          color="#1e3a8a"
          transparent
          opacity={0.32}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[14, -4, -18]}>
        <planeGeometry args={[24, 18]} />
        <meshBasicMaterial
          color="#7c2d12"
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Stars */}
      <Stars
        radius={60}
        depth={40}
        count={2400}
        factor={3}
        saturation={0.4}
        fade
        speed={0.4}
      />

      {/* Godray cone from above */}
      <Godray />

      {/* Main dais top */}
      <mesh position={[0, FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[ARENA_RADIUS, 96]} />
        <meshStandardMaterial
          color="#0e1330"
          emissive="#1e1b4b"
          emissiveIntensity={0.35}
          roughness={0.55}
          metalness={0.55}
        />
      </mesh>

      {/* Slightly thicker raised dais ring (so it looks like a platform with thickness) */}
      <mesh position={[0, FLOOR_Y - 0.15, 0]}>
        <cylinderGeometry args={[ARENA_RADIUS, ARENA_RADIUS - 0.15, 0.35, 96]} />
        <meshStandardMaterial
          color="#0a0d24"
          emissive="#3730a3"
          emissiveIntensity={0.5}
          roughness={0.5}
          metalness={0.6}
        />
      </mesh>

      {/* Inner concentric trim rings */}
      {[1.6, 2.6, 3.5, 4.4].map((r) => (
        <mesh key={r} position={[0, FLOOR_Y + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r - 0.012, r + 0.012, 96]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.32} toneMapped={false} />
        </mesh>
      ))}

      {/* Center sigil — rotating compound rune */}
      <group ref={innerSigilRef} position={[0, FLOOR_Y + 0.003, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.55, 64]} />
          <meshBasicMaterial color="#fb923c" toneMapped={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.65, 0.7, 6]} />
          <meshBasicMaterial color="#facc15" toneMapped={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <ringGeometry args={[0.92, 0.95, 4]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.85} toneMapped={false} />
        </mesh>
      </group>

      {/* Glowing perimeter ring */}
      <mesh ref={ringRef} position={[0, FLOOR_Y + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ARENA_RADIUS - 0.08, ARENA_RADIUS, 128]} />
        <meshBasicMaterial color="#fb923c" transparent opacity={0.95} toneMapped={false} />
      </mesh>

      {/* Beveled wall around the dais */}
      <mesh position={[0, FLOOR_Y + 0.18, 0]}>
        <torusGeometry args={[ARENA_RADIUS, 0.12, 16, 96]} />
        <meshStandardMaterial
          color="#0b1026"
          emissive="#312e81"
          emissiveIntensity={0.8}
          roughness={0.4}
          metalness={0.75}
        />
      </mesh>

      {/* Six tall obelisk pillars rising from the dais */}
      {pillars.map((p, i) => (
        <group key={i} position={[p.x, FLOOR_Y, p.z]} rotation={[0, -p.angle + Math.PI / 2, 0]}>
          {/* Base block */}
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial
              color="#0d1232"
              emissive="#1e1b4b"
              emissiveIntensity={0.4}
              roughness={0.7}
              metalness={0.5}
            />
          </mesh>
          {/* Tapered obelisk */}
          <mesh position={[0, 2.4, 0]}>
            <cylinderGeometry args={[0.05, 0.18, 4.2, 6]} />
            <meshStandardMaterial
              color="#0a0e26"
              emissive="#22d3ee"
              emissiveIntensity={1.4}
              roughness={0.45}
              metalness={0.65}
              toneMapped={false}
            />
          </mesh>
          {/* Energy seam (thin vertical glow strip facing the center) */}
          <mesh position={[0, 2.4, 0.19]}>
            <planeGeometry args={[0.05, 3.8]} />
            <meshBasicMaterial
              color="#67e8f9"
              transparent
              opacity={0.95}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          {/* Crown / floating capstone */}
          <mesh position={[0, 4.85, 0]}>
            <octahedronGeometry args={[0.26, 0]} />
            <meshStandardMaterial
              color="#fb923c"
              emissive="#fb923c"
              emissiveIntensity={2.8}
              toneMapped={false}
            />
          </mesh>
          {/* Halo around the crown */}
          <mesh position={[0, 4.85, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.42, 0.018, 8, 36]} />
            <meshBasicMaterial color="#facc15" transparent opacity={0.85} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Broken stone tiers hanging beneath the dais */}
      <BrokenTiers />

      {/* Drifting debris orbiting around the platform */}
      <FloatingDebris />

      {/* Subtle ground mist on the dais */}
      <mesh position={[0, FLOOR_Y + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[ARENA_RADIUS * 0.95, 64]} />
        <meshBasicMaterial
          color="#67e8f9"
          transparent
          opacity={0.05}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Down-spotlight */}
      <spotLight
        position={[0, 9, 0]}
        intensity={1.8}
        angle={Math.PI / 3.4}
        penumbra={0.55}
        color="#fff7ed"
        castShadow={false}
      />
    </group>
  );
}

// ── Target hovering above the arena ────────────────────────────────────────
function TargetCore({ value, isReveal }) {
  const meshRef = useRef();
  const ringRef = useRef();
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
      meshRef.current.rotation.x += delta * 0.18;
      const t = state.clock.elapsedTime;
      meshRef.current.position.y = 2.4 + Math.sin(t * 1.4) * 0.12;
      const pulse = 1 + Math.sin(t * 1.6) * 0.05;
      meshRef.current.scale.setScalar(pulse);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.7;
      ringRef.current.position.y = 2.4;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.85, 1]} />
        <meshStandardMaterial
          color={isReveal ? '#fb923c' : '#4f46e5'}
          emissive={isReveal ? '#f97316' : '#312e81'}
          emissiveIntensity={isReveal ? 2.6 : 1.2}
          roughness={0.3}
          metalness={0.7}
          wireframe
        />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.4, 0.045, 16, 96]} />
        <meshBasicMaterial color={isReveal ? '#fb923c' : '#22d3ee'} toneMapped={false} />
      </mesh>
      {isReveal && value !== null && value !== undefined && (
        <Text
          position={[0, 2.4, 1.0]}
          fontSize={0.78}
          color="#fff7ed"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#7c2d12"
        >
          {Number(value).toFixed(1)}
        </Text>
      )}
    </group>
  );
}

// ── Player ─────────────────────────────────────────────────────────────────
const DEATH_HIT_SEC = 0.18;
const DEATH_CRUMBLE_SEC = 0.45;
const DEATH_TOTAL_SEC = DEATH_HIT_SEC + DEATH_CRUMBLE_SEC;

function PlayerNode({
  index,
  total,
  player,
  submittedNonce,
  isWinner,
  winnerColor,
  winnerAccent,
  winnerPos,
  isPermanentlyEliminated,
  defeatBeatStart,
  isReveal,
  cinematicArmed,
}) {
  const groupRef = useRef();
  const meshRef = useRef();
  const haloRef = useRef();
  const padRef = useRef();
  const character = getCharacter(player.character);
  const color = useMemo(() => new THREE.Color(character.color), [character.color]);

  const base = useMemo(() => positionFor(index, total), [index, total]);

  const lastNonce = useRef(0);
  const pulseStart = useRef(0);
  const winStart = useRef(0);
  const localDefeatStart = useRef(0);

  useEffect(() => {
    if (submittedNonce > lastNonce.current) {
      lastNonce.current = submittedNonce;
      pulseStart.current = performance.now();
    }
  }, [submittedNonce]);

  useEffect(() => {
    if (isWinner && !winStart.current) {
      winStart.current = performance.now();
    } else if (!isWinner) {
      winStart.current = 0;
    }
  }, [isWinner]);

  useEffect(() => {
    if (defeatBeatStart && defeatBeatStart !== localDefeatStart.current) {
      localDefeatStart.current = defeatBeatStart;
    }
    if (!defeatBeatStart) {
      localDefeatStart.current = 0;
    }
  }, [defeatBeatStart]);

  useFrame((state) => {
    if (!groupRef.current || !meshRef.current) return;
    const t = state.clock.elapsedTime;
    // Subtle hover bob — they're standing on the dais, not orbiting in space.
    const bob = Math.sin(t * 1.6 + index) * 0.06;

    let posX = base.x;
    let posY = base.y + bob;
    let posZ = base.z;

    let scale = 1;
    let opacity = 1;
    let intensity = 1.0;
    let bodyColorMix = 0; // 0 = character color, 1 = white flash

    if (!isReveal) {
      const submitElapsed = pulseStart.current
        ? (performance.now() - pulseStart.current) / 1000
        : Infinity;
      if (submitElapsed < 1.2) {
        const k = 1 - submitElapsed / 1.2;
        scale *= 1 + k * 0.7;
        intensity = 2.0;
      } else if (player.hasSubmitted || player.number !== null) {
        intensity = 1.4;
      }
    }

    if (winStart.current) {
      const winElapsed = (performance.now() - winStart.current) / 1000;
      const windupNorm = Math.min(1, winElapsed / (ANNOUNCE_DELAY_MS / 1000));
      const windup = ease(windupNorm);
      scale *= 1 + windup * 0.95;
      intensity = 2.6 + windup * 2.4 + Math.sin(winElapsed * 6) * 0.6;
      posY += Math.sin(winElapsed * 5) * 0.1 + windup * 0.55;
    } else if (isReveal && cinematicArmed) {
      intensity *= 0.45;
      opacity *= 0.92;
    }

    const defeatElapsed = localDefeatStart.current
      ? (performance.now() - localDefeatStart.current) / 1000
      : null;

    if (defeatElapsed !== null && defeatElapsed >= 0) {
      // Direction of knockback: away from winner if known, otherwise outward from center.
      let dirX = base.x;
      let dirZ = base.z;
      if (winnerPos) {
        dirX = base.x - winnerPos.x;
        dirZ = base.z - winnerPos.z;
      }
      const dlen = Math.hypot(dirX, dirZ) || 1;
      dirX /= dlen;
      dirZ /= dlen;

      if (defeatElapsed < DEATH_HIT_SEC) {
        // Hit reaction: punch back, scale up, white-flash.
        const k = defeatElapsed / DEATH_HIT_SEC;
        const punch = ease(k);
        scale *= 1 + punch * 0.75;
        intensity = 5.0;
        bodyColorMix = 1 - k * 0.5;
        posX += dirX * punch * 0.55;
        posZ += dirZ * punch * 0.55;
        posY += Math.sin(k * Math.PI) * 0.2;
      } else if (defeatElapsed < DEATH_TOTAL_SEC) {
        // Crumble: shake, sink, fade.
        const k = (defeatElapsed - DEATH_HIT_SEC) / DEATH_CRUMBLE_SEC;
        const fade = 1 - k;
        scale *= 1 + 0.75 * fade + Math.sin(defeatElapsed * 60) * 0.08 * fade;
        opacity = fade;
        intensity = 4.0 * fade;
        bodyColorMix = 0.5 * fade;
        posX += dirX * (0.55 + k * 0.25);
        posZ += dirZ * (0.55 + k * 0.25);
        posY += Math.sin((1 - k) * Math.PI * 0.7) * 0.18 - k * 0.15;
      } else {
        scale = 0.001;
        opacity = 0;
      }
    }

    if (isPermanentlyEliminated && defeatElapsed !== null && defeatElapsed > DEATH_TOTAL_SEC + 0.2) {
      opacity = 0;
      scale = 0.001;
    }

    groupRef.current.position.set(posX, posY, posZ);
    meshRef.current.scale.setScalar(Math.max(0.001, scale));
    if (meshRef.current.material) {
      meshRef.current.material.emissiveIntensity = intensity;
      meshRef.current.material.opacity = Math.max(0, opacity);
      meshRef.current.material.transparent = true;
      // White-flash on hit by lerping color toward white.
      meshRef.current.material.color.copy(color).lerp(WHITE_COLOR, bodyColorMix);
      meshRef.current.material.emissive.copy(color).lerp(WHITE_COLOR, bodyColorMix * 0.7);
    }

    if (padRef.current && padRef.current.material) {
      const padOpacity = defeatElapsed !== null && defeatElapsed > 0
        ? Math.max(0, 0.7 - defeatElapsed * 1.8)
        : 0.7;
      padRef.current.material.opacity = padOpacity * opacity;
    }

    if (haloRef.current && haloRef.current.material) {
      haloRef.current.rotation.z += 0.024;
      const haloOpacity = isWinner
        ? 1.0
        : (player.hasSubmitted || player.number !== null) && !isReveal
        ? 0.6
        : 0.0;
      haloRef.current.material.opacity = Math.max(0, haloOpacity * opacity);
    }
  });

  const dyingOrDead = isPermanentlyEliminated || !!defeatBeatStart;

  return (
    <>
      <group ref={groupRef} position={[base.x, base.y, base.z]}>
        {/* Floor pad under each player */}
        <mesh ref={padRef} position={[0, FLOOR_Y + 0.01 - base.y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.6, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} toneMapped={false} />
        </mesh>
        {/* Body */}
        <mesh ref={meshRef}>
          <icosahedronGeometry args={[0.4, 1]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.2}
            roughness={0.25}
            metalness={0.55}
            toneMapped={false}
          />
        </mesh>
        {/* Halo */}
        <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.62, 0.025, 12, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0} toneMapped={false} />
        </mesh>
        <Html
          position={[0, 0.95, 0]}
          center
          distanceFactor={9}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`player-3d-label${isWinner ? ' is-winner' : ''}${dyingOrDead ? ' is-eliminated' : ''}`}
            style={{ '--char-color': character.color }}
          >
            <span className="player-3d-glyph">{character.glyph}</span>
            <span className="player-3d-name">{player.name}</span>
          </div>
        </Html>
        {isWinner && (
          <Html
            position={[0, -0.65, 0]}
            center
            distanceFactor={9}
            style={{ pointerEvents: 'none' }}
          >
            <div className="player-3d-winner-tag">WINNER</div>
          </Html>
        )}
        {isPermanentlyEliminated && (
          <Html
            position={[0, -0.65, 0]}
            center
            distanceFactor={9}
            style={{ pointerEvents: 'none' }}
          >
            <div className="player-3d-skull">💀</div>
          </Html>
        )}
      </group>

      {/* Winner-only: charging aura under their feet during the windup */}
      {isWinner ? (
        <ChargeAura
          origin={base}
          duration={ANNOUNCE_DELAY_MS / 1000}
          color={winnerColor || character.color}
          accent={winnerAccent || character.accent}
          floorY={FLOOR_Y}
        />
      ) : null}

      {/* Per-death burst — colored to the WINNER's finisher so it reads as their attack */}
      {defeatBeatStart ? (
        <DeathBurst
          origin={base}
          color={winnerColor || character.color}
          accent={winnerAccent || character.accent}
          startTime={defeatBeatStart + DEATH_HIT_SEC * 1000}
        />
      ) : null}

      {/* Vertical soul column rising from the body — reads as the player being "taken" */}
      {defeatBeatStart ? (
        <SoulColumn
          origin={base}
          color={character.color}
          startTime={defeatBeatStart + DEATH_HIT_SEC * 1000}
          floorY={FLOOR_Y}
        />
      ) : null}

      {/* Lingering scorch sigil where they fell */}
      {defeatBeatStart ? (
        <ScorchMark
          origin={base}
          color={winnerColor || character.color}
          startTime={defeatBeatStart + DEATH_HIT_SEC * 1000}
          floorY={FLOOR_Y}
        />
      ) : null}
    </>
  );
}

const WHITE_COLOR = new THREE.Color('#fff7ed');

export default function CenterStage({
  players = [],
  submittedNonces = {},
  targetValue = null,
  isReveal = false,
  winnerId = null,
  defeatedIds = [],
  eliminatedIds = [],
}) {
  const eliminatedSet = useMemo(() => new Set(eliminatedIds), [eliminatedIds]);

  const [revealStart, setRevealStart] = useState(null);
  const [cinematicArmed, setCinematicArmed] = useState(false);

  useEffect(() => {
    if (isReveal && winnerId) {
      const start = performance.now();
      setRevealStart(start);
      setCinematicArmed(false);
      const timer = setTimeout(() => setCinematicArmed(true), ANNOUNCE_DELAY_MS);
      return () => clearTimeout(timer);
    }
    setRevealStart(null);
    setCinematicArmed(false);
  }, [isReveal, winnerId]);

  const indexById = useMemo(() => {
    const map = {};
    players.forEach(([id], idx) => { map[id] = idx; });
    return map;
  }, [players]);
  const total = players.length;

  const beats = useMemo(() => {
    if (!cinematicArmed || !revealStart || !winnerId) return {};
    const winnerIdx = indexById[winnerId];
    if (winnerIdx === undefined) return {};
    const winnerPos = positionFor(winnerIdx, total);
    const ordered = [...defeatedIds]
      .filter((id) => indexById[id] !== undefined)
      .map((id) => {
        const p = positionFor(indexById[id], total);
        const dist = Math.hypot(p.x - winnerPos.x, p.z - winnerPos.z);
        return { id, dist };
      })
      .sort((a, b) => a.dist - b.dist);

    const cinematicStart = revealStart + ANNOUNCE_DELAY_MS;
    const map = {};
    ordered.forEach((item, i) => {
      map[item.id] = cinematicStart + i * BEAT_GAP_MS;
    });
    return map;
  }, [cinematicArmed, revealStart, defeatedIds, winnerId, indexById, total]);

  const winnerIdx = winnerId ? indexById[winnerId] : null;
  const winnerPos = winnerIdx !== null && winnerIdx !== undefined
    ? positionFor(winnerIdx, total)
    : null;
  const winnerCharacter = winnerId
    ? getCharacter((players.find(([id]) => id === winnerId) || [null, {}])[1].character)
    : null;
  const winnerFinisher = winnerCharacter?.finisher || null;
  const winnerColor = winnerFinisher?.color || winnerCharacter?.color || '#fde68a';
  const winnerAccent = winnerFinisher?.accent || winnerCharacter?.accent || '#fb923c';

  return (
    <div className="center-stage">
      <Canvas
        shadows
        camera={{ position: [0, 3.4, 8.5], fov: 50 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <color attach="background" args={[0, 0, 0, 0]} />
        <fog attach="fog" args={['#0a0d24', 14, 38]} />
        <ambientLight intensity={0.35} />
        <pointLight position={[5, 5, 5]} intensity={1.4} color="#f97316" />
        <pointLight position={[-5, -3, -2]} intensity={0.9} color="#22d3ee" />
        <pointLight position={[0, 7, 0]} intensity={1.4} color="#a78bfa" />
        <hemisphereLight intensity={0.35} color="#a78bfa" groundColor="#1e1b4b" />

        <Arena />
        <TargetCore value={targetValue} isReveal={isReveal} />

        {winnerPos && cinematicArmed && (
          <Shockwave
            origin={winnerPos}
            startTime={revealStart + ANNOUNCE_DELAY_MS}
            color={winnerFinisher?.accent || winnerColor}
            floorY={FLOOR_Y}
          />
        )}

        {players.map(([id, player], idx) => (
          <PlayerNode
            key={id}
            index={idx}
            total={total}
            player={player}
            submittedNonce={submittedNonces[id] || 0}
            isWinner={winnerId === id}
            winnerColor={winnerColor}
            winnerAccent={winnerAccent}
            winnerPos={winnerPos}
            isPermanentlyEliminated={eliminatedSet.has(id)}
            defeatBeatStart={beats[id] || 0}
            isReveal={isReveal}
            cinematicArmed={cinematicArmed}
          />
        ))}

        {winnerPos && cinematicArmed && defeatedIds.map((id) => {
          const idx = indexById[id];
          if (idx === undefined) return null;
          const target = positionFor(idx, total);
          return (
            <FinisherAttack
              key={`finisher-${id}`}
              from={winnerPos}
              to={target}
              beatStart={beats[id] || 0}
              finisher={winnerFinisher}
              floorY={FLOOR_Y}
            />
          );
        })}

        <EffectComposer multisampling={0}>
          <Bloom
            intensity={1.8}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.85}
            mipmapBlur
            radius={0.85}
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={[0.0009, 0.0009]}
          />
          <Vignette eskil={false} offset={0.28} darkness={0.7} />
        </EffectComposer>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2.05}
          minPolarAngle={Math.PI / 3.5}
          target={[0, 0.6, 0]}
          enableDamping
        />
      </Canvas>
    </div>
  );
}
