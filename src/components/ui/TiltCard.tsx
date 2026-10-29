import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // Maximum rotation in degrees (3-5deg recommended)
  glowColor?: string; // RGB values for cursor lighting: '16, 185, 129' (emerald), '244, 63, 94' (rose), etc.
  showGlow?: boolean;
}

/**
 * TiltCard: Premium 3D perspective card with cursor-following radial lighting.
 * Automatically disables 3D rotation on touch devices and respects reduced motion.
 */
export const TiltCard = React.forwardRef<HTMLDivElement, TiltCardProps>(
  (
    {
      children,
      className,
      maxTilt = 3.5,
      glowColor = '16, 185, 129',
      showGlow = true,
      onMouseMove,
      onMouseLeave,
      ...props
    },
    forwardedRef
  ) => {
    const cardRef = useRef<HTMLDivElement | null>(null);
    const [tiltStyle, setTiltStyle] = useState<{
      transform: string;
      transition: string;
    }>({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 500ms cubic-bezier(0.23, 1, 0.32, 1)',
    });

    const [isHovered, setIsHovered] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
    const [canHover, setCanHover] = useState(true);

    // Check device capabilities and reduced motion
    useEffect(() => {
      const isTouch = !window.matchMedia('(hover: hover)').matches;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setCanHover(!isTouch && !reducedMotion);
    }, []);

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!canHover) return;

        const card = cardRef.current;
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate normalized positions (-1 to 1)
        const normalizedX = (x / rect.width) * 2 - 1;
        const normalizedY = (y / rect.height) * 2 - 1;

        // RotateX depends on vertical displacement (inverted), RotateY on horizontal
        const rotateX = -(normalizedY * maxTilt);
        const rotateY = normalizedX * maxTilt;

        setMousePos({
          x: Math.round((x / rect.width) * 100),
          y: Math.round((y / rect.height) * 100),
        });

        setTiltStyle({
          transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.008, 1.008, 1.008)`,
          transition: 'transform 80ms ease-out', // Snappy while cursor moves
        });

        if (onMouseMove) {
          onMouseMove(e as any);
        }
      },
      [canHover, maxTilt, onMouseMove]
    );

    const handlePointerEnter = useCallback(() => {
      if (!canHover) return;
      setIsHovered(true);
    }, [canHover]);

    const handlePointerLeave = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        setIsHovered(false);
        // Smooth spring-like return to rest
        setTiltStyle({
          transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transition: 'transform 450ms cubic-bezier(0.23, 1, 0.32, 1)',
        });

        if (onMouseLeave) {
          onMouseLeave(e as any);
        }
      },
      [onMouseLeave]
    );

    // Merge internal and forwarded refs
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        cardRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [forwardedRef]
    );

    return (
      <div
        ref={setRefs}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        style={canHover ? tiltStyle : undefined}
        className={cn(
          'relative rounded-2xl border border-border/70 bg-card/90 text-card-foreground shadow-sm transition-shadow duration-300 will-change-transform overflow-hidden backdrop-blur-md',
          isHovered && 'shadow-xl shadow-black/20 border-border/90',
          !canHover && 'active:scale-[0.99] transition-transform duration-150',
          className
        )}
        {...props}
      >
        {/* 1. Cursor-reactive radial surface spotlight */}
        {showGlow && canHover && (
          <div
            className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
            style={{
              opacity: isHovered ? 1 : 0,
              background: `radial-gradient(circle 280px at ${mousePos.x}% ${mousePos.y}%, rgba(${glowColor}, 0.12), transparent 75%)`,
            }}
            aria-hidden="true"
          />
        )}

        {/* 2. Cursor-reactive border highlight */}
        {showGlow && canHover && (
          <div
            className="pointer-events-none absolute -inset-[1px] rounded-[inherit] z-0 transition-opacity duration-300"
            style={{
              opacity: isHovered ? 1 : 0,
              background: `radial-gradient(circle 200px at ${mousePos.x}% ${mousePos.y}%, rgba(${glowColor}, 0.35), transparent 70%)`,
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
              WebkitMaskComposite: 'xor',
              padding: '1px',
            }}
            aria-hidden="true"
          />
        )}

        {/* 3. Card Content (Elevated above lighting layers) */}
        <div className="relative z-10 w-full h-full">{children}</div>
      </div>
    );
  }
);

TiltCard.displayName = 'TiltCard';
