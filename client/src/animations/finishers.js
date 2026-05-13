import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const ANNOUNCE_DELAY_MS = 1800;
export const BEAT_GAP_MS = 720;
const BEAM_PRE_HIT_MS = 220;

export const ease = (t) => t * t * (3 - 2 * t);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const getAttackWindow = (beatStart, leadSeconds = BEAM_PRE_HIT_MS / 1000, durationSeconds = 0.7) => {
  if (!beatStart) return null;
  const attackTime = (performance.now() - beatStart) / 1000 + leadSeconds;
  if (attackTime < 0 || attackTime > durationSeconds) return null;
  const progress = Math.min(1, attackTime / durationSeconds);
  const opacity =
    progress < 0.35
      ? progress / 0.35
      : 1 - ((progress - 0.35) / 0.65);

  return {
    progress,
    opacity: Math.max(0, opacity),
  };
};

const lineTransform = (from, to) => {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz) || 0.001;
  return {
    length,
    midX: (to.x + from.x) / 2,
    midZ: (to.z + from.z) / 2,
    yawRad: Math.atan2(dx, dz),
  };
};

function ImpactFlash({ to, beatStart, color, accent, floorY }) {
  const ringRef = useRef();
  const ring2Ref = useRef();
  const coreRef = useRef();
  const burstRef = useRef();

  useFrame(() => {
    const attack = getAttackWindow(beatStart, 0, 1.1);
    const opacity = attack ? attack.opacity : 0;
    const scale = attack ? 0.4 + easeOutCubic(attack.progress) * 2.5 : 0.001;

    if (ringRef.current) {
      ringRef.current.scale.setScalar(scale);
      ringRef.current.rotation.z += 0.05;
      ringRef.current.material.opacity = opacity * 1.0;
    }
    if (ring2Ref.current) {
      ring2Ref.current.scale.setScalar(attack ? 0.2 + easeOutCubic(attack.progress) * 3.4 : 0.001);
      ring2Ref.current.rotation.z -= 0.07;
      ring2Ref.current.material.opacity = opacity * 0.7;
    }
    if (coreRef.current) {
      coreRef.current.scale.setScalar(attack ? 0.4 + attack.opacity * 1.6 : 0.001);
      coreRef.current.material.opacity = opacity * 0.9;
    }
    if (burstRef.current) {
      // 4-pointed star "spark" — punchy hit accent
      const sparkProg = attack ? attack.progress : 0;
      burstRef.current.rotation.z = sparkProg * Math.PI * 1.5;
      burstRef.current.scale.setScalar(attack ? (0.4 + (1 - sparkProg) * 1.6) * (opacity > 0 ? 1 : 0) : 0.001);
      burstRef.current.children.forEach((c) => {
        if (c.material) c.material.opacity = opacity * 1.2;
      });
    }
  });

  return (
    <group position={[to.x, floorY + 0.04, to.z]}>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.05, 16, 80]} />
        <meshBasicMaterial
          color={accent || color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.025, 16, 80]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={coreRef} position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.6, 24, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Four-pointed star spark on the hit */}
      <group ref={burstRef} position={[0, 0.5, 0]}>
        {[0, Math.PI / 2].map((rot, i) => (
          <mesh key={i} rotation={[0, 0, rot]}>
            <planeGeometry args={[3.4, 0.08]} />
            <meshBasicMaterial
              color="#fff7ed"
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function FlameThrower({ from, to, beatStart, color, accent }) {
  const meshRef = useRef();
  const coreRef = useRef();
  const emberRef = useRef();
  const embers = useMemo(() => (
    Array.from({ length: 18 }, (_, i) => ({
      offset: i / 17,
      drift: (Math.random() - 0.5) * 0.42,
      lift: Math.random() * 0.72,
      size: 0.055 + Math.random() * 0.08,
    }))
  ), []);

  useFrame(() => {
    const attack = getAttackWindow(beatStart, 0.24, 0.95);
    const opacity = attack ? attack.opacity : 0;
    if (meshRef.current) {
      meshRef.current.material.opacity = opacity * 0.68;
      meshRef.current.scale.setScalar(attack ? 0.7 + ease(attack.progress) * 0.9 : 0.001);
    }
    if (coreRef.current) {
      coreRef.current.material.opacity = opacity * 0.58;
      coreRef.current.scale.setScalar(attack ? 0.7 + Math.sin(attack.progress * Math.PI) * 0.25 : 0.001);
    }
    if (emberRef.current) {
      emberRef.current.children.forEach((child, i) => {
        const ember = embers[i];
        const active = attack && ember.offset <= attack.progress + 0.24;
        child.material.opacity = active ? opacity * (1 - ember.offset * 0.45) : 0;
        child.scale.setScalar(active ? 1 + opacity * 1.1 : 0.001);
      });
    }
  });

  const { length, midX, midZ, yawRad } = useMemo(() => lineTransform(from, to), [from, to]);

  return (
    <group position={[midX, 0.4, midZ]} rotation={[Math.PI / 2, yawRad, 0]}>
      <mesh ref={meshRef}>
        <coneGeometry args={[0.56, length, 32, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={coreRef}>
        <coneGeometry args={[0.22, length * 0.94, 18, 1, true]} />
        <meshBasicMaterial color={accent} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={emberRef}>
        {embers.map((ember, i) => (
          <mesh key={i} position={[ember.drift, (ember.offset - 0.5) * length, ember.lift]}>
            <sphereGeometry args={[ember.size, 10, 8]} />
            <meshBasicMaterial color={i % 2 ? color : accent} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function LaserArray({ from, to, beatStart, color, accent }) {
  const groupRef = useRef();
  const { length, midX, midZ, yawRad } = useMemo(() => lineTransform(from, to), [from, to]);

  useFrame(() => {
    const attack = getAttackWindow(beatStart, 0.18, 0.58);
    const opacity = attack ? attack.opacity : 0;
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      child.material.opacity = opacity * (i === 1 ? 1.0 : 0.7);
      child.scale.set(1, attack ? 0.25 + ease(attack.progress) * 0.95 : 0.001, 1);
    });
  });

  return (
    <group ref={groupRef} position={[midX, 0.45, midZ]} rotation={[Math.PI / 2, yawRad, 0]}>
      {[-0.22, 0, 0.22].map((offset, i) => (
        <mesh key={offset} position={[offset, 0, 0]}>
          <cylinderGeometry args={[i === 1 ? 0.085 : 0.04, i === 1 ? 0.085 : 0.04, length, 12, 1, true]} />
          <meshBasicMaterial color={i === 1 ? color : accent} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function LanceStrike({ from, to, beatStart, color, accent }) {
  const shaftRef = useRef();
  const haloRef = useRef();
  const tipRef = useRef();
  const { length, midX, midZ, yawRad } = useMemo(() => lineTransform(from, to), [from, to]);

  useFrame(() => {
    const attack = getAttackWindow(beatStart, 0.22, 0.64);
    const opacity = attack ? attack.opacity : 0;
    if (shaftRef.current) {
      shaftRef.current.material.opacity = opacity * 0.95;
      shaftRef.current.scale.set(1, attack ? 0.35 + ease(attack.progress) * 0.9 : 0.001, 1);
    }
    if (haloRef.current) {
      haloRef.current.material.opacity = opacity * 0.55;
      haloRef.current.scale.set(1, attack ? 0.4 + ease(attack.progress) * 0.85 : 0.001, 1);
    }
    if (tipRef.current) {
      tipRef.current.material.opacity = opacity;
      tipRef.current.position.y = attack ? (attack.progress - 0.5) * length : -length * 0.5;
      tipRef.current.scale.setScalar(attack ? 0.9 + opacity * 1.1 : 0.001);
    }
  });

  return (
    <group position={[midX, 0.48, midZ]} rotation={[Math.PI / 2, yawRad, 0]}>
      <mesh ref={haloRef}>
        <cylinderGeometry args={[0.12, 0.12, length, 14, 1, true]} />
        <meshBasicMaterial color={accent} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={shaftRef}>
        <cylinderGeometry args={[0.055, 0.055, length, 14, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={tipRef}>
        <coneGeometry args={[0.28, 0.7, 20]} />
        <meshBasicMaterial color={accent} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function SlashFinisher({ from, to, beatStart, color, accent, shadow = false }) {
  const dashRef = useRef();
  const slashRef = useRef();
  const { length, midX, midZ, yawRad } = useMemo(() => lineTransform(from, to), [from, to]);

  useFrame(() => {
    const attack = getAttackWindow(beatStart, 0.18, 0.66);
    const opacity = attack ? attack.opacity : 0;
    if (dashRef.current) {
      dashRef.current.material.opacity = opacity * (shadow ? 0.48 : 0.3);
      dashRef.current.scale.set(1, attack ? 0.3 + attack.progress * 0.9 : 0.001, 1);
    }
    if (slashRef.current) {
      slashRef.current.rotation.y += shadow ? 0.08 : 0.12;
      slashRef.current.scale.setScalar(attack ? 0.35 + ease(attack.progress) * 1.55 : 0.001);
      slashRef.current.children.forEach((child, i) => {
        child.material.opacity = opacity * (i === 0 ? 0.95 : 0.72);
      });
    }
  });

  return (
    <>
      <group position={[midX, 0.36, midZ]} rotation={[Math.PI / 2, yawRad, 0]}>
        <mesh ref={dashRef}>
          <cylinderGeometry args={[shadow ? 0.13 : 0.06, shadow ? 0.13 : 0.06, length, 12, 1, true]} />
          <meshBasicMaterial color={shadow ? accent : color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
      <group ref={slashRef} position={[to.x, 0.62, to.z]}>
        {[Math.PI / 4, -Math.PI / 4, shadow ? Math.PI / 2 : 0].map((rotation, i) => (
          <mesh key={i} rotation={[0, 0, rotation]}>
            <cylinderGeometry args={[0.035, 0.035, shadow && i === 2 ? 1.1 : 1.55, 8]} />
            <meshBasicMaterial color={i === 1 ? accent : color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </>
  );
}

function ArcaneFinisher({ to, beatStart, color, accent, hex = false, floorY }) {
  const groupRef = useRef();

  useFrame(() => {
    const attack = getAttackWindow(beatStart, 0.1, 0.92);
    const opacity = attack ? attack.opacity : 0;
    if (!groupRef.current) return;
    groupRef.current.rotation.y += hex ? 0.035 : 0.025;
    groupRef.current.scale.setScalar(attack ? 0.5 + ease(attack.progress) * 1.15 : 0.001);
    groupRef.current.children.forEach((child, i) => {
      child.material.opacity = opacity * (i === 0 ? 0.85 : 0.58);
    });
  });

  return (
    <group ref={groupRef} position={[to.x, floorY + 0.08, to.z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.72, 0.035, hex ? 6 : 16, hex ? 6 : 72]} />
        <meshBasicMaterial color={color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.65, 0]} rotation={[Math.PI / 2, 0, Math.PI / 5]}>
        <torusGeometry args={[0.52, 0.025, hex ? 6 : 12, hex ? 6 : 54]} />
        <meshBasicMaterial color={accent} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.65, 0]} rotation={[0, Math.PI / 2, Math.PI / 4]}>
        <torusGeometry args={[0.44, 0.02, hex ? 6 : 12, hex ? 6 : 48]} />
        <meshBasicMaterial color={hex ? accent : color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function ProjectileFinisher({ from, to, beatStart, color, accent, orbital = false }) {
  const projectileRef = useRef();
  const trailRef = useRef();

  useFrame(() => {
    const attack = getAttackWindow(beatStart, orbital ? 0.04 : 0.16, orbital ? 0.86 : 0.74);
    const opacity = attack ? attack.opacity : 0;
    const p = attack ? ease(attack.progress) : 0;

    if (projectileRef.current) {
      if (orbital) {
        projectileRef.current.position.set(
          to.x + (1 - p) * 1.3,
          3.6 - p * 3.2,
          to.z + (1 - p) * 1.1,
        );
      } else {
        projectileRef.current.position.set(
          from.x + (to.x - from.x) * p,
          0.65 + Math.sin(p * Math.PI) * 1.2,
          from.z + (to.z - from.z) * p,
        );
      }
      projectileRef.current.scale.setScalar(attack ? 0.75 + opacity * 0.8 : 0.001);
      projectileRef.current.material.opacity = opacity;
    }
    if (trailRef.current) {
      trailRef.current.position.copy(projectileRef.current.position);
      trailRef.current.material.opacity = opacity * 0.35;
      trailRef.current.scale.setScalar(attack ? 0.8 + p * 1.2 : 0.001);
    }
  });

  return (
    <>
      <mesh ref={projectileRef} position={[from.x, 0.65, from.z]}>
        <sphereGeometry args={[orbital ? 0.18 : 0.2, 18, 14]} />
        <meshStandardMaterial color={color} emissive={accent} emissiveIntensity={2.8} transparent opacity={0} toneMapped={false} />
      </mesh>
      <mesh ref={trailRef} position={[from.x, 0.65, from.z]}>
        <sphereGeometry args={[0.34, 18, 14]} />
        <meshBasicMaterial color={accent} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  );
}

function EmberRush({ from, to, beatStart, color, accent }) {
  const emberRef = useRef();
  const embers = useMemo(() => (
    Array.from({ length: 22 }, (_, i) => ({
      progress: i / 21,
      drift: (Math.random() - 0.5) * 0.56,
      lift: Math.random() * 0.7,
      size: 0.05 + Math.random() * 0.075,
    }))
  ), []);

  useFrame(() => {
    const attack = getAttackWindow(beatStart, 0.16, 0.78);
    const opacity = attack ? attack.opacity : 0;
    if (!emberRef.current) return;
    emberRef.current.children.forEach((child, i) => {
      const ember = embers[i];
      const active = attack && ember.progress < attack.progress + 0.2;
      child.material.opacity = active ? opacity * (1 - ember.progress * 0.35) : 0;
      child.scale.setScalar(active ? 1 + opacity * 0.8 : 0.001);
    });
  });

  return (
    <group ref={emberRef}>
      {embers.map((ember, i) => (
        <mesh
          key={i}
          position={[
            from.x + (to.x - from.x) * ember.progress + ember.drift,
            0.3 + Math.sin(ember.progress * Math.PI) * 0.55 + ember.lift,
            from.z + (to.z - from.z) * ember.progress - ember.drift * 0.4,
          ]}
        >
          <sphereGeometry args={[ember.size, 10, 8]} />
          <meshBasicMaterial color={i % 2 ? color : accent} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

const FINISHER_RENDERERS = {
  flame: FlameThrower,
  laser: LaserArray,
  lance: LanceStrike,
  'shadow-slash': (props) => <SlashFinisher {...props} shadow />,
  blade: SlashFinisher,
  arcane: ArcaneFinisher,
  hex: (props) => <ArcaneFinisher {...props} hex />,
  cannon: ProjectileFinisher,
  orbital: (props) => <ProjectileFinisher {...props} orbital />,
  ember: EmberRush,
};

export function FinisherAttack({ from, to, beatStart, finisher, floorY }) {
  const color = finisher?.color || '#fde68a';
  const accent = finisher?.accent || color;
  const Renderer = FINISHER_RENDERERS[finisher?.type] || LaserArray;

  return (
    <>
      <Renderer
        from={from}
        to={to}
        beatStart={beatStart}
        color={color}
        accent={accent}
        floorY={floorY}
      />
      <ImpactFlash
        to={to}
        beatStart={beatStart}
        color={color}
        accent={accent}
        floorY={floorY}
      />
    </>
  );
}

export function Shockwave({ origin, startTime, color = '#fb923c', floorY }) {
  const meshRef = useRef();
  useFrame(() => {
    if (!meshRef.current) return;
    if (!startTime) {
      meshRef.current.material.opacity = 0;
      meshRef.current.scale.setScalar(0.001);
      return;
    }
    const elapsed = (performance.now() - startTime) / 1000;
    if (elapsed > 2.6) {
      meshRef.current.material.opacity = 0;
      return;
    }
    const radius = 0.4 + ease(Math.min(1, elapsed / 2.4)) * 5.2;
    meshRef.current.scale.setScalar(radius);
    meshRef.current.material.opacity = Math.max(0, 0.85 * (1 - elapsed / 2.6));
  });

  return (
    <mesh ref={meshRef} position={[origin.x, floorY + 0.02, origin.z]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1, 0.04, 16, 96]} />
      <meshBasicMaterial color={color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

export function DeathBurst({ origin, color, accent, startTime }) {
  const groupRef = useRef();
  const sparkRef = useRef();
  const SHARD_COUNT = 38;
  const SPARK_COUNT = 24;
  const DURATION = 1.6;

  const shards = useMemo(() => {
    const out = [];
    for (let i = 0; i < SHARD_COUNT; i += 1) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      out.push({
        dir: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.sin(phi) * Math.sin(theta),
          Math.cos(phi),
        ).multiplyScalar(1.0 + Math.random() * 2.6),
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12,
        ),
        size: 0.06 + Math.random() * 0.13,
        accent: i % 3 === 0,
      });
    }
    return out;
  }, []);

  const sparks = useMemo(() => (
    Array.from({ length: SPARK_COUNT }, () => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      return {
        dir: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.sin(phi) * Math.sin(theta) * 0.6 + 0.2,
          Math.cos(phi),
        ).multiplyScalar(1.8 + Math.random() * 2.6),
        size: 0.04 + Math.random() * 0.06,
      };
    })
  ), []);

  useFrame(() => {
    if (!startTime) return;
    const elapsed = (performance.now() - startTime) / 1000;

    if (groupRef.current) {
      if (elapsed < 0) {
        groupRef.current.children.forEach((child) => {
          if (child.material) child.material.opacity = 0;
        });
      } else {
        const t = Math.min(DURATION, elapsed) / DURATION;
        groupRef.current.children.forEach((child, i) => {
          const shard = shards[i];
          if (!shard) return;
          child.position.set(
            origin.x + shard.dir.x * t * 2.4,
            origin.y + shard.dir.y * t * 2.2 - t * t * 0.9,
            origin.z + shard.dir.z * t * 2.4,
          );
          child.rotation.x += shard.spin.x * 0.018;
          child.rotation.y += shard.spin.y * 0.018;
          child.material.opacity = Math.max(0, 1 - t);
          child.material.transparent = true;
        });
      }
    }

    if (sparkRef.current) {
      if (elapsed < 0) {
        sparkRef.current.children.forEach((c) => {
          if (c.material) c.material.opacity = 0;
        });
      } else {
        const t = Math.min(0.8, elapsed) / 0.8;
        sparkRef.current.children.forEach((child, i) => {
          const spark = sparks[i];
          if (!spark) return;
          child.position.set(
            origin.x + spark.dir.x * t * 2.0,
            origin.y + spark.dir.y * t * 1.7 - t * t * 0.5,
            origin.z + spark.dir.z * t * 2.0,
          );
          child.material.opacity = Math.max(0, 1 - t);
        });
      }
    }
  });

  if (!startTime) return null;

  return (
    <>
      <group ref={groupRef}>
        {shards.map((shard, i) => (
          <mesh key={i}>
            <tetrahedronGeometry args={[shard.size, 0]} />
            <meshStandardMaterial
              color={shard.accent && accent ? accent : color}
              emissive={shard.accent && accent ? accent : color}
              emissiveIntensity={3.2}
              transparent
              opacity={0}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      <group ref={sparkRef}>
        {sparks.map((spark, i) => (
          <mesh key={i}>
            <sphereGeometry args={[spark.size, 8, 6]} />
            <meshBasicMaterial
              color="#fff7ed"
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </>
  );
}

// Vertical column of light rising from the body, reads as the player being "taken".
export function SoulColumn({ origin, color, startTime, floorY }) {
  const groupRef = useRef();
  const beamRef = useRef();
  const wispRef = useRef();
  const DURATION = 1.3;

  useFrame(() => {
    if (!groupRef.current || !startTime) return;
    const elapsed = (performance.now() - startTime) / 1000;
    if (elapsed < 0) {
      if (beamRef.current?.material) beamRef.current.material.opacity = 0;
      if (wispRef.current?.material) wispRef.current.material.opacity = 0;
      return;
    }
    const t = Math.min(DURATION, elapsed) / DURATION;
    // Beam: punches up fast, then fades.
    if (beamRef.current) {
      const beamProg = Math.min(1, elapsed / 0.35);
      const fade = 1 - Math.max(0, (elapsed - 0.35) / (DURATION - 0.35));
      beamRef.current.scale.set(1, easeOutCubic(beamProg) * 6.5, 1);
      if (beamRef.current.material) {
        beamRef.current.material.opacity = Math.max(0, fade) * 0.95;
      }
    }
    // Wisp: small glow orb that rises up the beam
    if (wispRef.current) {
      const riseT = easeOutCubic(t);
      wispRef.current.position.set(origin.x, floorY + 0.2 + riseT * 5.5, origin.z);
      const wispFade = 1 - Math.max(0, (elapsed - 0.7) / (DURATION - 0.7));
      const pulse = 1 + Math.sin(elapsed * 14) * 0.18;
      wispRef.current.scale.setScalar(0.4 * pulse);
      if (wispRef.current.material) {
        wispRef.current.material.opacity = Math.max(0, wispFade);
      }
    }
  });

  if (!startTime) return null;

  return (
    <group ref={groupRef}>
      {/* Vertical beam — scaled along Y to grow upward */}
      <mesh ref={beamRef} position={[origin.x, floorY + 0.5, origin.z]}>
        <cylinderGeometry args={[0.22, 0.38, 1, 16, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {/* Wisp orb rising up */}
      <mesh ref={wispRef} position={[origin.x, floorY + 0.2, origin.z]}>
        <sphereGeometry args={[0.5, 18, 14]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// Lingering scorch sigil on the floor where the player was struck down.
export function ScorchMark({ origin, color, startTime, floorY }) {
  const groupRef = useRef();
  const ringRef = useRef();
  const innerRef = useRef();
  const FADE_IN = 0.35;
  const HOLD_OPACITY = 0.85;

  useFrame(() => {
    if (!groupRef.current || !startTime) return;
    const elapsed = (performance.now() - startTime) / 1000;
    if (elapsed < 0) {
      if (ringRef.current?.material) ringRef.current.material.opacity = 0;
      if (innerRef.current?.material) innerRef.current.material.opacity = 0;
      return;
    }
    const fadeIn = Math.min(1, elapsed / FADE_IN);
    const flicker = 1 + Math.sin(elapsed * 6) * 0.05;
    if (ringRef.current?.material) {
      ringRef.current.material.opacity = fadeIn * HOLD_OPACITY * flicker;
    }
    if (innerRef.current?.material) {
      innerRef.current.material.opacity = fadeIn * 0.55 * flicker;
      innerRef.current.rotation.z = elapsed * 0.6;
    }
  });

  if (!startTime) return null;

  return (
    <group ref={groupRef} position={[origin.x, floorY + 0.015, origin.z]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.62, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.18, 6]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// Winner-only charging aura: ring of runes at their feet, charged orbs rising.
export function ChargeAura({ origin, duration = 1.8, color, accent, floorY }) {
  const groupRef = useRef();
  const ringRef = useRef();
  const innerRef = useRef();
  const sparksRef = useRef();
  const startRef = useRef(0);

  useEffect(() => {
    startRef.current = performance.now();
    return () => { startRef.current = 0; };
  }, []);

  const sparks = useMemo(() => (
    Array.from({ length: 12 }, (_, i) => ({
      angle: (i / 12) * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
      lift: 0.4 + Math.random() * 0.5,
    }))
  ), []);

  useFrame(() => {
    if (!startRef.current) return;
    const elapsed = (performance.now() - startRef.current) / 1000;
    const grow = Math.min(1, elapsed / duration);
    const eased = easeOutCubic(grow);

    if (ringRef.current) {
      ringRef.current.rotation.z = elapsed * 0.8;
      ringRef.current.scale.setScalar(0.5 + eased * 1.0);
      if (ringRef.current.material) {
        ringRef.current.material.opacity = 0.4 + eased * 0.55;
      }
    }
    if (innerRef.current) {
      innerRef.current.rotation.z = -elapsed * 1.2;
      innerRef.current.scale.setScalar(0.4 + eased * 0.7);
      if (innerRef.current.material) {
        innerRef.current.material.opacity = 0.55 + Math.sin(elapsed * 8) * 0.2;
      }
    }
    if (sparksRef.current) {
      sparksRef.current.children.forEach((child, i) => {
        const s = sparks[i];
        if (!s) return;
        const rise = ((elapsed * 1.6 + s.phase) % 1.0);
        child.position.set(
          Math.cos(s.angle) * 0.7,
          rise * s.lift * (1 + eased * 1.4),
          Math.sin(s.angle) * 0.7,
        );
        const fade = 1 - rise;
        child.scale.setScalar(0.12 + eased * 0.08);
        if (child.material) child.material.opacity = fade * eased;
      });
    }
  });

  return (
    <group ref={groupRef} position={[origin.x, floorY + 0.02, origin.z]}>
      {/* Outer hex rune */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.78, 0.92, 6]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Inner rune */}
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.55, 3]} />
        <meshBasicMaterial
          color={accent || color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Rising sparks */}
      <group ref={sparksRef}>
        {sparks.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshBasicMaterial
              color={accent || color}
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
