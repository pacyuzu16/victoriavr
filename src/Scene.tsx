import { useMemo, useRef, useEffect, useState, Suspense } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Splat, OrbitControls, Environment, Float, Stars, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { useWorld, selectObject, type Entity, type TimeOfDay } from "./world";
import { registerCamera } from "./camera";
import { ErrorBoundary } from "./ErrorBoundary";

const SKY: Record<TimeOfDay, string> = { day: "#8fb7e6", dusk: "#e88a4e", night: "#0c1330" };
const LIGHTTINT: Record<TimeOfDay, string> = { day: "#fff6e8", dusk: "#ffb27a", night: "#9fb2ff" };

function FlickerLight({ color, intensity, distance, position }: { color: string; intensity: number; distance: number; position: [number, number, number] }) {
  const ref = useRef<THREE.PointLight>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const f = 0.82 + 0.18 * Math.sin(t * 12) + 0.08 * Math.sin(t * 27 + 1);
    if (ref.current) ref.current.intensity = intensity * f;
  });
  return <pointLight ref={ref} color={color} intensity={intensity} distance={distance} position={position} />;
}

function Prop({ e, onSelect }: { e: Entity; onSelect: (id: string) => void }) {
  const click = (ev: any) => { ev.stopPropagation(); onSelect(e.id); };
  const rot: [number, number, number] = [0, e.rot || 0, 0];

  switch (e.type) {
    case "lantern":
      return (
        <group position={e.position} rotation={rot} onClick={click}>
          <mesh>
            <sphereGeometry args={[0.16, 24, 24]} />
            <meshStandardMaterial color="#ffcf7a" emissive={e.lit ? "#ffb02e" : "#000"} emissiveIntensity={e.lit ? 2.2 : 0} roughness={0.4} />
          </mesh>
          {e.lit && <FlickerLight color="#ffb84d" intensity={2.4} distance={4} position={[0, 0, 0]} />}
        </group>
      );
    case "guitar":
      return (
        <Float speed={1.5} rotationIntensity={0.6} floatIntensity={0.6}>
          <mesh position={e.position} onClick={click} castShadow>
            <torusKnotGeometry args={[0.16, 0.055, 140, 24]} />
            <meshStandardMaterial color="#e64b5a" metalness={0.9} roughness={0.15} />
          </mesh>
        </Float>
      );
    case "candle":
      return (
        <group position={e.position} rotation={rot} onClick={click}>
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.05, 0.055, 0.22, 16]} />
            <meshStandardMaterial color="#f2ead9" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshStandardMaterial color="#ffd27a" emissive="#ff9d2e" emissiveIntensity={3} />
          </mesh>
          {e.lit && <FlickerLight color="#ffb060" intensity={1.4} distance={3} position={[0, 0.14, 0]} />}
        </group>
      );
    case "books":
      return (
        <group position={e.position} rotation={rot} onClick={click}>
          {["#8a3b3b", "#3b5a8a", "#3b7a52"].map((c, i) => (
            <mesh key={i} position={[i * 0.02, -0.08 + i * 0.06, 0]} rotation={[0, i * 0.2, 0]} castShadow>
              <boxGeometry args={[0.3, 0.055, 0.22]} />
              <meshStandardMaterial color={c} roughness={0.85} />
            </mesh>
          ))}
        </group>
      );
    case "flowers":
      return (
        <group position={e.position} rotation={rot} onClick={click}>
          <mesh position={[0, -0.05, 0]}>
            <cylinderGeometry args={[0.08, 0.06, 0.18, 14]} />
            <meshStandardMaterial color="#cdd6e0" roughness={0.3} metalness={0.1} />
          </mesh>
          {[["#e8748c", 0.09, 0.12], ["#f0c04a", -0.08, 0.16], ["#a97ce0", 0.02, 0.2]].map(([c, x, y], i) => (
            <mesh key={i} position={[x as number, y as number, i % 2 ? 0.05 : -0.05]}>
              <sphereGeometry args={[0.05, 12, 12]} />
              <meshStandardMaterial color={c as string} roughness={0.6} />
            </mesh>
          ))}
        </group>
      );
    case "mug":
      return (
        <group position={e.position} rotation={rot} onClick={click}>
          <mesh>
            <cylinderGeometry args={[0.1, 0.085, 0.16, 20]} />
            <meshStandardMaterial color="#e8ede8" roughness={0.4} />
          </mesh>
          <mesh position={[0.12, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.05, 0.018, 10, 20]} />
            <meshStandardMaterial color="#e8ede8" roughness={0.4} />
          </mesh>
        </group>
      );
    case "rug":
      return (
        <mesh position={[e.position[0], 0.012, e.position[2]]} rotation={[-Math.PI / 2, 0, 0]} onClick={click} receiveShadow>
          <circleGeometry args={[0.7, 40]} />
          <meshStandardMaterial color="#8a4a4a" roughness={0.95} />
        </mesh>
      );
    case "lamp":
      return (
        <group position={e.position} rotation={rot} onClick={click}>
          <mesh position={[0, -0.05, 0]}>
            <cylinderGeometry args={[0.09, 0.11, 0.04, 20]} />
            <meshStandardMaterial color="#3a3a44" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.26, 10]} />
            <meshStandardMaterial color="#3a3a44" roughness={0.4} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <coneGeometry args={[0.13, 0.16, 20, 1, true]} />
            <meshStandardMaterial color="#ffe6b0" emissive={e.lit ? "#ffcf80" : "#000"} emissiveIntensity={e.lit ? 1.6 : 0} side={THREE.DoubleSide} roughness={0.5} />
          </mesh>
          {e.lit && <FlickerLight color="#ffcf80" intensity={1.8} distance={4} position={[0, 0.22, 0]} />}
        </group>
      );
    case "cushion":
      return (
        <mesh position={[e.position[0], 0.06, e.position[2]]} rotation={rot} onClick={click} scale={[1, 0.42, 1]} castShadow>
          <sphereGeometry args={[0.2, 20, 16]} />
          <meshStandardMaterial color="#c86b7a" roughness={0.9} />
        </mesh>
      );
    default: // plant
      return (
        <group position={e.position} rotation={rot} onClick={click}>
          <mesh position={[0, -0.05, 0]}>
            <cylinderGeometry args={[0.12, 0.09, 0.16, 16]} />
            <meshStandardMaterial color="#8a5a3c" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <coneGeometry args={[0.22, 0.5, 12]} />
            <meshStandardMaterial color="#3f9b52" roughness={0.7} />
          </mesh>
        </group>
      );
  }
}

// A standing window that visibly reacts to the world's windowOpen state — the sash
// swings ajar, closing the loop between "open the window" (tool) and what you see.
function Window({ open, tint }: { open: boolean; tint: string }) {
  const sash = useRef<THREE.Group>(null!);
  const W = 0.62, H = 1.3, T = 0.05;
  useFrame((_, dt) => {
    if (!sash.current) return;
    const target = open ? -1.15 : 0;
    sash.current.rotation.y += (target - sash.current.rotation.y) * Math.min(1, dt * 5);
  });
  const Bar = (p: [number, number, number], a: [number, number, number]) => (
    <mesh position={p} castShadow><boxGeometry args={a} /><meshStandardMaterial color="#6b4a2f" roughness={0.6} /></mesh>
  );
  const glass = (
    <meshPhysicalMaterial color={tint} roughness={0.08} metalness={0} transmission={0.6} transparent opacity={0.34} thickness={0.1} side={THREE.DoubleSide} />
  );
  return (
    <group position={[-1.75, 0.92, -1.15]} rotation={[0, 0.62, 0]}>
      {/* outer frame */}
      {Bar([0, H / 2, 0], [2 * W + 0.1, T, T])}
      {Bar([0, -H / 2, 0], [2 * W + 0.1, T, T])}
      {Bar([-W - 0.025, 0, 0], [T, H + T, T])}
      {Bar([W + 0.025, 0, 0], [T, H + T, T])}
      {Bar([0, 0, 0], [T * 0.7, H, T * 0.7])}
      {/* fixed left pane */}
      <mesh position={[-W / 2, 0, 0]}><planeGeometry args={[W - 0.05, H - 0.08]} />{glass}</mesh>
      {/* right sash — pivots on the center mullion */}
      <group ref={sash} position={[0, 0, 0]}>
        <group position={[W / 2, 0, 0]}>
          <mesh><planeGeometry args={[W - 0.05, H - 0.08]} />{glass}</mesh>
          <mesh position={[0, H / 2 - 0.04, 0]}><boxGeometry args={[W - 0.02, 0.035, 0.035]} /><meshStandardMaterial color="#7a5636" roughness={0.6} /></mesh>
          <mesh position={[0, -H / 2 + 0.04, 0]}><boxGeometry args={[W - 0.02, 0.035, 0.035]} /><meshStandardMaterial color="#7a5636" roughness={0.6} /></mesh>
        </group>
      </group>
    </group>
  );
}

function SelectionRing() {
  const ref = useRef<THREE.Mesh>(null!);
  const e = useWorld((s) => s.entities.find((x) => x.id === s.selectedId));
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.z += dt * 1.3; });
  if (!e) return null;
  return (
    <mesh ref={ref} position={[e.position[0], 0.02, e.position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.44, 0.02, 8, 48]} />
      <meshStandardMaterial color="#6d78ff" emissive="#6d78ff" emissiveIntensity={2.2} toneMapped={false} />
    </mesh>
  );
}

function Motes() {
  const ref = useRef<THREE.Points>(null!);
  const N = 140;
  const pos = useMemo(() => {
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { a[i * 3] = (Math.random() - 0.5) * 6; a[i * 3 + 1] = Math.random() * 3; a[i * 3 + 2] = (Math.random() - 0.5) * 6; }
    return a;
  }, []);
  useFrame((state, dt) => {
    const p = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = p.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < N; i++) { arr[i * 3 + 1] += dt * 0.06; arr[i * 3] += Math.sin(t * 0.5 + i) * dt * 0.02; if (arr[i * 3 + 1] > 3) arr[i * 3 + 1] = 0; }
    p.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} count={140} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.012} transparent opacity={0.22} sizeAttenuation />
    </points>
  );
}

function Precip({ color, speed, size, drift }: { color: string; speed: number; size: number; drift: boolean }) {
  const ref = useRef<THREE.Points>(null!);
  const COUNT = 520;
  const positions = useMemo(() => {
    const a = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) { a[i * 3] = (Math.random() - 0.5) * 8; a[i * 3 + 1] = Math.random() * 6; a[i * 3 + 2] = (Math.random() - 0.5) * 8; }
    return a;
  }, []);
  useFrame((state, dt) => {
    const p = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = p.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < COUNT; i++) { arr[i * 3 + 1] -= dt * speed; if (drift) arr[i * 3] += Math.sin(t + i) * dt * 0.15; if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 6; }
    p.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={520} />
      </bufferGeometry>
      <pointsMaterial color={color} size={size} transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

// The photoreal hero environment. We fetch the splat ourselves into a blob URL
// before handing it to the loader. This mirrors the (already-working) user-upload
// path and sidesteps host quirks — e.g. a CDN that serves the file without a
// Content-Length header, which the streaming splat loader needs. blob:/data: URLs
// are already local, so they pass straight through. Bounded retry on failure, then
// graceful degradation to no-hero (never a crash).
function HeroSplat({ src }: { src: string }) {
  const [resolved, setResolved] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const tries = useRef(0);

  useEffect(() => {
    tries.current = 0;
    if (src.startsWith("blob:") || src.startsWith("data:")) { setResolved(src); return; }
    let cancelled = false;
    let objUrl: string | null = null;
    const load = (attempt: number) => {
      fetch(src)
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob(); })
        .then((b) => { if (cancelled) return; objUrl = URL.createObjectURL(b); setResolved(objUrl); })
        .catch(() => { if (!cancelled && attempt < 2) window.setTimeout(() => load(attempt + 1), 1000); });
    };
    setResolved(null);
    load(0);
    return () => { cancelled = true; if (objUrl) URL.revokeObjectURL(objUrl); };
  }, [src]);

  if (!resolved) return null;
  return (
    <ErrorBoundary
      key={`${resolved}#${nonce}`}
      fallback={null}
      onError={() => {
        if (tries.current < 2) { tries.current++; window.setTimeout(() => setNonce((n) => n + 1), 1000); }
      }}
    >
      <group position={[0, 1.15, 0]} scale={0.5} rotation={[0, Math.PI, 0]}>
        <Splat src={resolved} />
      </group>
    </ErrorBoundary>
  );
}

function CameraRig() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as any;
  useEffect(() => {
    if (!controls) return;
    const target: THREE.Vector3 = controls.target;
    registerCamera({
      dolly: (f) => {
        const off = camera.position.clone().sub(target);
        off.setLength(THREE.MathUtils.clamp(off.length() * f, 1.3, 14));
        camera.position.copy(target.clone().add(off));
        controls.update();
      },
      orbit: (az, pol) => {
        const off = camera.position.clone().sub(target);
        const sph = new THREE.Spherical().setFromVector3(off);
        sph.theta -= az;
        sph.phi = THREE.MathUtils.clamp(sph.phi + pol, 0.15, Math.PI - 0.15);
        off.setFromSpherical(sph);
        camera.position.copy(target.clone().add(off));
        controls.update();
      },
      reset: () => controls.reset(),
      toggleAuto: () => {
        controls.autoRotate = !controls.autoRotate;
        controls.autoRotateSpeed = 1.3;
        return controls.autoRotate;
      },
    });
  }, [controls, camera]);
  return null;
}

export default function Scene() {
  const { lightLevel, timeOfDay, weather, entities, heroSplat, windowOpen } = useWorld();
  const foggy = weather === "fog";

  return (
    <>
      <color attach="background" args={[SKY[timeOfDay]]} />
      <fog attach="fog" args={[SKY[timeOfDay], foggy ? 2 : 6, foggy ? 11 : 18]} />

      <ambientLight intensity={0.25 + 0.35 * lightLevel} color={LIGHTTINT[timeOfDay]} />
      <directionalLight position={[3, 6, 2]} intensity={1.4 * lightLevel} color={LIGHTTINT[timeOfDay]} castShadow />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#1a1b22" roughness={0.95} />
      </mesh>

      <mesh position={[0, -0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.16, 1.0]} />
        <meshStandardMaterial color="#6b4a2f" roughness={0.6} />
      </mesh>

      <Suspense fallback={null}>
        {/* a bad/corrupt splat (e.g. a user upload) degrades to no-hero instead of
            crashing; a transient network failure retries before giving up */}
        <HeroSplat src={heroSplat} />
        <Environment preset="apartment" />
      </Suspense>

      <ContactShadows position={[0, 0.002, 0]} opacity={0.45} scale={14} blur={2.4} far={4} color="#000000" />

      <Window open={windowOpen} tint={SKY[timeOfDay]} />

      {entities.map((e) => (
        <Prop key={e.id} e={e} onSelect={selectObject} />
      ))}
      <SelectionRing />
      <Motes />

      {timeOfDay === "night" && <Stars radius={60} depth={30} count={1200} factor={3} fade speed={0.6} />}
      {weather === "rain" && <Precip color="#9fc6ff" speed={6} size={0.03} drift={false} />}
      {weather === "snow" && <Precip color="#ffffff" speed={1.2} size={0.05} drift />}

      <OrbitControls makeDefault enableDamping enablePan enableZoom target={[0, 0.2, 0]} minDistance={1.3} maxDistance={14} />
      <CameraRig />

      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.55} />
      </EffectComposer>
    </>
  );
}
