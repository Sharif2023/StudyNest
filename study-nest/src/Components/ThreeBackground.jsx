import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Environment, Sphere } from '@react-three/drei';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform float uTime;
  uniform vec2 uMouse;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vViewPosition = -worldPosition.xyz;
    
    float distortion = sin(position.x * 3.0 + uTime * 0.5) * 0.15 + 
                       cos(position.y * 2.0 + uTime * 0.8) * 0.15 +
                       sin(length(position.xy - uMouse) * 2.0 - uTime) * 0.2;
                       
    vec3 newPosition = position + normal * distortion;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform float uTime;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - dot(normal, viewDir), 4.0);
    
    vec3 color1 = vec3(0.39, 0.40, 0.95); // Deep Cyber Blue
    vec3 color2 = vec3(0.96, 0.25, 0.37); // Neon Crimson
    vec3 color3 = vec3(0.63, 0.31, 0.95); // Electric Violet
    
    float mixFactor = fresnel + sin(uTime * 0.3) * 0.5 + 0.5;
    vec3 finalColor = mix(color1, mix(color2, color3, sin(uTime * 0.5) * 0.5 + 0.5), mixFactor);
    
    finalColor += fresnel * 0.8;
    
    gl_FragColor = vec4(finalColor, 0.1 + fresnel * 0.3);
  }
`;

const AnimatedCore = () => {
  const meshRef = useRef();
  const materialRef = useRef();
  const { mouse } = useThree();
  const targetMouse = useRef(new THREE.Vector2(0, 0));
  const startTime = useRef(performance.now() / 1000);

  useFrame((state) => {
    const time = (performance.now() / 1000) - startTime.current;
    
    // Smooth mouse inertia
    targetMouse.current.x = THREE.MathUtils.lerp(targetMouse.current.x, mouse.x * 2.0, 0.05);
    targetMouse.current.y = THREE.MathUtils.lerp(targetMouse.current.y, mouse.y * 2.0, 0.05);

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
      materialRef.current.uniforms.uMouse.value = targetMouse.current;
    }
    
    if (meshRef.current) {
      meshRef.current.rotation.x = time * 0.1;
      meshRef.current.rotation.y = time * 0.15;
      meshRef.current.position.x = targetMouse.current.x * 0.5;
      meshRef.current.position.y = targetMouse.current.y * 0.5;
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) }
  }), []);

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5}>
      <Sphere ref={meshRef} args={[1, 128, 128]} scale={3}>
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent={true}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </Sphere>
    </Float>
  );
};

const HyperParticles = ({ count = 200 }) => {
  const pointsRef = useRef();
  const { mouse } = useThree();
  const startTime = useRef(performance.now() / 1000);
  
  const [positions, scales] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const scl = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
      scl[i] = Math.random();
    }
    return [pos, scl];
  }, [count]);

  useFrame((state) => {
    const time = (performance.now() / 1000) - startTime.current;
    if (pointsRef.current) {
      pointsRef.current.rotation.y = time * 0.015;
      pointsRef.current.rotation.z = time * 0.01;
      
      const positionsAr = pointsRef.current.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        const x = positionsAr[i * 3];
        const y = positionsAr[i * 3 + 1];
        
        // Turbulence reactive to mouse
        const dist = Math.sqrt((x - mouse.x * 10) ** 2 + (y - mouse.y * 10) ** 2);
        const force = Math.max(0, 1.0 - dist / 5.0);
        
        positionsAr[i * 3 + 1] += Math.sin(time + i) * 0.005 + force * 0.02;
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial 
        size={0.06} 
        color="#818cf8" 
        transparent 
        opacity={0.4} 
        sizeAttenuation 
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 -z-5 pointer-events-none overflow-hidden surface-glow">
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }} dpr={[1, 2]}>
        <color attach="background" args={['#010208']} />
        <ambientLight intensity={0.1} />
        <pointLight position={[15, 15, 15]} intensity={2} color="#6366f1" />
        <pointLight position={[-15, -15, -15]} intensity={1.5} color="#f43f5e" />
        <pointLight position={[0, 0, 10]} intensity={1} color="#a855f7" />
        
        <Suspense fallback={null}>
          <AnimatedCore />
          <HyperParticles />
          <Environment preset="night" />
        </Suspense>
      </Canvas>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(1,2,8,0.4)_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/20 to-slate-950 pointer-events-none" />
    </div>
  );
}

