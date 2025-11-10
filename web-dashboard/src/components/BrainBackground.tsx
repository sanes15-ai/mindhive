'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Neural network particles that form a brain-like structure
function NeuralNetwork() {
  const ref = useRef<THREE.Points>(null);
  const particlesCount = 2000;

  // Generate brain-shaped particle positions
  const positions = new Float32Array(particlesCount * 3);
  const colors = new Float32Array(particlesCount * 3);

  for (let i = 0; i < particlesCount; i++) {
    // Create brain-like ellipsoid shape
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 2 + Math.random() * 1.5;

    // Add some clustering for brain hemisphere effect
    const cluster = Math.random() > 0.5 ? 1 : -1;
    
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta) + cluster * 0.5;
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    // Purple/pink gradient colors for brain theme
    const colorMix = Math.random();
    colors[i * 3] = 0.5 + colorMix * 0.5; // R
    colors[i * 3 + 1] = 0.2 + colorMix * 0.3; // G
    colors[i * 3 + 2] = 0.8 + colorMix * 0.2; // B
  }

  // Animate particles - gentle pulsing and rotation
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
      ref.current.rotation.y += 0.001;
      
      // Pulse effect
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      ref.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <Points ref={ref} positions={positions} colors={colors} stride={3}>
      <PointMaterial
        transparent
        size={0.03}
        sizeAttenuation
        depthWrite={false}
        vertexColors
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

// Neural connections between particles
function NeuralConnections() {
  const ref = useRef<THREE.LineSegments>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.0005;
      
      // Pulse opacity
      const opacity = 0.1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
      if (ref.current.material instanceof THREE.LineBasicMaterial) {
        ref.current.material.opacity = opacity;
      }
    }
  });

  // Create connection lines
  const connectionCount = 300;
  const positions = new Float32Array(connectionCount * 6);

  for (let i = 0; i < connectionCount; i++) {
    const theta1 = Math.random() * Math.PI * 2;
    const phi1 = Math.acos(2 * Math.random() - 1);
    const radius1 = 2 + Math.random() * 1.5;

    const theta2 = theta1 + (Math.random() - 0.5) * 0.5;
    const phi2 = phi1 + (Math.random() - 0.5) * 0.5;
    const radius2 = 2 + Math.random() * 1.5;

    // Start point
    positions[i * 6] = radius1 * Math.sin(phi1) * Math.cos(theta1);
    positions[i * 6 + 1] = radius1 * Math.sin(phi1) * Math.sin(theta1);
    positions[i * 6 + 2] = radius1 * Math.cos(phi1);

    // End point
    positions[i * 6 + 3] = radius2 * Math.sin(phi2) * Math.cos(theta2);
    positions[i * 6 + 4] = radius2 * Math.sin(phi2) * Math.sin(theta2);
    positions[i * 6 + 5] = radius2 * Math.cos(phi2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  return (
    <lineSegments ref={ref} geometry={geometry}>
      <lineBasicMaterial
        color="#8b5cf6"
        transparent
        opacity={0.15}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

// Main 3D Brain Background Component
export default function BrainBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-gradient-to-br from-purple-950 via-black to-blue-950">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#a78bfa" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ec4899" />
        
        <NeuralNetwork />
        <NeuralConnections />
      </Canvas>

      {/* Additional glow effects */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-purple-500/5 to-transparent pointer-events-none" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full blur-[120px] opacity-20 animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500 rounded-full blur-[120px] opacity-20 animate-pulse-slow animation-delay-2000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500 rounded-full blur-[150px] opacity-10 animate-pulse-slow animation-delay-4000" />
    </div>
  );
}

