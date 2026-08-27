"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import type { Group } from "three";

function Token() {
  const meshRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.4;
  });

  return (
    <group ref={meshRef}>
      <mesh>
        <cylinderGeometry args={[1.4, 1.4, 0.3, 64]} />
        <meshStandardMaterial color="#FF6B8A" emissive="#9B5FC0" emissiveIntensity={0.2} metalness={0.6} roughness={0.3} />
      </mesh>
      <Text position={[0, 0, 0.16]} fontSize={0.9} color="#0A0B0D">
        BB
      </Text>
    </group>
  );
}

export function HeroToken() {
  return (
    <Canvas camera={{ position: [0, 0, 4] }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 3, 3]} intensity={1} color="#7BE8E8" />
      <pointLight position={[-3, -2, 2]} intensity={0.8} color="#FF9B7A" />
      <Token />
    </Canvas>
  );
}

export default HeroToken;
