import React from 'react';
import { ParticleBackground } from './ParticleBackground';

export const AmbientBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. Deep Layered Base Lighting (Dark mode fintech depth) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.09),rgba(3,7,18,0))]" />

      {/* 2. Top-Right Soft Emerald Aura */}
      <div className="absolute -top-[15%] -right-[10%] w-[55vw] h-[55vw] max-w-[650px] max-h-[650px] rounded-full bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07] blur-[100px] animate-pulse duration-[8000ms]" />

      {/* 3. Bottom-Left Subtle Cyan/Navy Aura */}
      <div className="absolute -bottom-[20%] -left-[10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-cyan-500/[0.03] dark:bg-cyan-500/[0.05] blur-[120px]" />

      {/* 4. Fine Mesh Micro-Grid (Subtle futuristic fintech texture) */}
      <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px]" />

      {/* 5. Interactive Particle Canvas */}
      <ParticleBackground />
    </div>
  );
};
